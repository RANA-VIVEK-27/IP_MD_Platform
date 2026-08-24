import uuid
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.commission import CommissionConfig, CommissionTransaction, FinancialLedger
from app.models.catalog import PartnerPharmacy
from app.models.identity import User
from app.models.orders import Order, OrderLineItem

class CommissionEngine:
    @staticmethod
    def get_active_config(db: Session, doctor_id: Optional[uuid.UUID] = None, pharmacy_id: Optional[uuid.UUID] = None) -> Tuple[Decimal, Decimal, str, str]:
        """
        Resolves active commission configuration based on hierarchy:
        1. Pharmacy-specific config
        2. Doctor-specific config
        3. Global config (default: 5% Doctor rate, 2% Platform rate of Doctor comm, deduct from vendor)
        Returns tuple of (doctor_comm_rate, platform_comm_rate, platform_comm_base, settlement_mode)
        """
        # 1. Check pharmacy scope
        if pharmacy_id:
            cfg = db.query(CommissionConfig).filter(
                CommissionConfig.pharmacy_id == pharmacy_id,
                CommissionConfig.scope == 'pharmacy',
                CommissionConfig.status == 'active'
            ).order_by(CommissionConfig.created_at.desc()).first()
            if cfg:
                return (
                    Decimal(str(cfg.doctor_commission_rate)),
                    Decimal(str(cfg.platform_commission_rate)),
                    cfg.platform_commission_base,
                    cfg.settlement_mode
                )

        # 2. Check doctor scope
        if doctor_id:
            cfg = db.query(CommissionConfig).filter(
                CommissionConfig.doctor_id == doctor_id,
                CommissionConfig.scope == 'doctor',
                CommissionConfig.status == 'active'
            ).order_by(CommissionConfig.created_at.desc()).first()
            if cfg:
                return (
                    Decimal(str(cfg.doctor_commission_rate)),
                    Decimal(str(cfg.platform_commission_rate)),
                    cfg.platform_commission_base,
                    cfg.settlement_mode
                )

        # 3. Check global scope or fallback default
        cfg = db.query(CommissionConfig).filter(
            CommissionConfig.scope == 'global',
            CommissionConfig.status == 'active'
        ).order_by(CommissionConfig.created_at.desc()).first()
        if cfg:
            return (
                Decimal(str(cfg.doctor_commission_rate)),
                Decimal(str(cfg.platform_commission_rate)),
                cfg.platform_commission_base,
                cfg.settlement_mode
            )

        # Fallback defaults per spec: 5% Doctor, 2% Platform of Doctor comm, deduct_from_vendor
        return (Decimal('5.00'), Decimal('2.00'), 'doctor_commission', 'deduct_from_vendor')

    @staticmethod
    def calculate_split(
        amount_paise: int,
        doctor_comm_rate: Decimal,
        platform_comm_rate: Decimal,
        platform_comm_base: str = 'doctor_commission',
        settlement_mode: str = 'deduct_from_vendor'
    ) -> Dict[str, Any]:
        """
        Calculates exact integer paise breakdown without floating point inaccuracies.
        """
        amount_dec = Decimal(amount_paise)

        # Calculate Doctor Commission Amount
        doctor_comm_amount = (amount_dec * doctor_comm_rate / Decimal('100')).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
        doctor_comm_paise = int(doctor_comm_amount)

        # Calculate Platform Commission Amount
        if platform_comm_base == 'order_total':
            platform_comm_amount = (amount_dec * platform_comm_rate / Decimal('100')).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
        else:
            # Base is doctor_commission
            platform_comm_amount = (Decimal(doctor_comm_paise) * platform_comm_rate / Decimal('100')).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
        
        platform_comm_paise = int(platform_comm_amount)

        # Calculate Vendor Gross & Net Settlement
        vendor_gross_paise = amount_paise
        if settlement_mode == 'deduct_from_vendor':
            vendor_net_paise = max(0, vendor_gross_paise - doctor_comm_paise - platform_comm_paise)
        else:
            vendor_net_paise = vendor_gross_paise

        return {
            'doctor_commission_rate': doctor_comm_rate,
            'doctor_commission_amount_paise': doctor_comm_paise,
            'platform_commission_rate': platform_comm_rate,
            'platform_commission_base': platform_comm_base,
            'platform_commission_amount_paise': platform_comm_paise,
            'vendor_gross_amount_paise': vendor_gross_paise,
            'vendor_net_amount_paise': vendor_net_paise,
            'settlement_mode': settlement_mode
        }

    @classmethod
    def calculate_and_snapshot(
        cls,
        db: Session,
        order_id: uuid.UUID,
        amount_paise: int,
        pharmacy_id: Optional[uuid.UUID] = None,
        line_item_id: Optional[uuid.UUID] = None
    ) -> CommissionTransaction:
        """
        Calculates split, creates immutable CommissionTransaction snapshot, and appends FinancialLedger entries.
        """
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")

        # Resolve Doctor Admin owner for this pharmacy
        doctor_id = None
        if pharmacy_id:
            pharmacy = db.query(PartnerPharmacy).filter(PartnerPharmacy.partner_id == pharmacy_id).first()
            if pharmacy and pharmacy.owner_doctor_id:
                doctor_id = pharmacy.owner_doctor_id

        doc_rate, plat_rate, plat_base, set_mode = cls.get_active_config(db, doctor_id=doctor_id, pharmacy_id=pharmacy_id)
        split = cls.calculate_split(amount_paise, doc_rate, plat_rate, plat_base, set_mode)

        # Create immutable CommissionTransaction snapshot
        tx = CommissionTransaction(
            order_id=order_id,
            line_item_id=line_item_id,
            doctor_id=doctor_id,
            pharmacy_id=pharmacy_id,
            doctor_commission_rate=split['doctor_commission_rate'],
            doctor_commission_amount_paise=split['doctor_commission_amount_paise'],
            platform_commission_rate=split['platform_commission_rate'],
            platform_commission_base=split['platform_commission_base'],
            platform_commission_amount_paise=split['platform_commission_amount_paise'],
            vendor_gross_amount_paise=split['vendor_gross_amount_paise'],
            vendor_net_amount_paise=split['vendor_net_amount_paise'],
            settlement_mode=split['settlement_mode'],
            currency='INR',
            commission_status='approved'
        )
        db.add(tx)
        db.flush()

        # Find Super Admin for ledger entry
        super_admin = db.query(User).filter(User.role == 'super_admin').first()
        super_admin_id = super_admin.user_id if super_admin else None

        # Create Financial Ledger Entries (reconciling sum)
        # 1. Customer Payment
        db.add(FinancialLedger(
            order_id=order_id,
            transaction_type='customer_payment',
            entity_type='patient',
            entity_id=order.patient_id,
            amount_paise=amount_paise
        ))

        # 2. Doctor Commission
        if doctor_id and split['doctor_commission_amount_paise'] > 0:
            db.add(FinancialLedger(
                order_id=order_id,
                transaction_type='doctor_commission',
                entity_type='doctor',
                entity_id=doctor_id,
                amount_paise=split['doctor_commission_amount_paise']
            ))

        # 3. Super Admin Platform Commission
        if split['platform_commission_amount_paise'] > 0:
            db.add(FinancialLedger(
                order_id=order_id,
                transaction_type='super_admin_commission',
                entity_type='super_admin',
                entity_id=super_admin_id,
                amount_paise=split['platform_commission_amount_paise']
            ))

        # 4. Pharmacy Net Settlement
        if pharmacy_id and split['vendor_net_amount_paise'] > 0:
            db.add(FinancialLedger(
                order_id=order_id,
                transaction_type='pharmacy_settlement',
                entity_type='pharmacy',
                entity_id=pharmacy_id,
                amount_paise=split['vendor_net_amount_paise']
            ))

        db.commit()
        db.refresh(tx)
        return tx

    @classmethod
    def process_reversal(
        cls,
        db: Session,
        order_id: uuid.UUID,
        refund_amount_paise: int
    ) -> CommissionTransaction:
        """
        Processes full or partial reversal for refunded orders by appending reversal ledger entries.
        """
        orig_tx = db.query(CommissionTransaction).filter(
            CommissionTransaction.order_id == order_id
        ).order_by(CommissionTransaction.created_at.desc()).first()

        if not orig_tx:
            raise ValueError(f"No commission transaction snapshot found for order {order_id}")

        # Proportional ratio if partial refund
        orig_gross = orig_tx.vendor_gross_amount_paise
        ratio = Decimal(refund_amount_paise) / Decimal(orig_gross) if orig_gross > 0 else Decimal('1')

        rev_doc_comm = int((Decimal(orig_tx.doctor_commission_amount_paise) * ratio).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
        rev_plat_comm = int((Decimal(orig_tx.platform_commission_amount_paise) * ratio).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
        rev_net_settle = int((Decimal(orig_tx.vendor_net_amount_paise) * ratio).quantize(Decimal('1'), rounding=ROUND_HALF_UP))

        # Update original transaction status or create reversal snapshot
        orig_tx.commission_status = 'reversed' if refund_amount_paise >= orig_gross else 'refunded'

        rev_tx = CommissionTransaction(
            order_id=order_id,
            line_item_id=orig_tx.line_item_id,
            doctor_id=orig_tx.doctor_id,
            pharmacy_id=orig_tx.pharmacy_id,
            doctor_commission_rate=orig_tx.doctor_commission_rate,
            doctor_commission_amount_paise=-rev_doc_comm,
            platform_commission_rate=orig_tx.platform_commission_rate,
            platform_commission_base=orig_tx.platform_commission_base,
            platform_commission_amount_paise=-rev_plat_comm,
            vendor_gross_amount_paise=-refund_amount_paise,
            vendor_net_amount_paise=-rev_net_settle,
            settlement_mode=orig_tx.settlement_mode,
            currency='INR',
            commission_status='reversed'
        )
        db.add(rev_tx)

        # Append Reversal Ledger Entries
        db.add(FinancialLedger(
            order_id=order_id,
            transaction_type='reversal',
            entity_type='patient',
            entity_id=None,
            amount_paise=-refund_amount_paise
        ))

        if orig_tx.doctor_id and rev_doc_comm > 0:
            db.add(FinancialLedger(
                order_id=order_id,
                transaction_type='reversal',
                entity_type='doctor',
                entity_id=orig_tx.doctor_id,
                amount_paise=-rev_doc_comm
            ))

        if rev_plat_comm > 0:
            db.add(FinancialLedger(
                order_id=order_id,
                transaction_type='reversal',
                entity_type='super_admin',
                entity_id=None,
                amount_paise=-rev_plat_comm
            ))

        if orig_tx.pharmacy_id and rev_net_settle > 0:
            db.add(FinancialLedger(
                order_id=order_id,
                transaction_type='reversal',
                entity_type='pharmacy',
                entity_id=orig_tx.pharmacy_id,
                amount_paise=-rev_net_settle
            ))

        db.commit()
        db.refresh(rev_tx)
        return rev_tx
