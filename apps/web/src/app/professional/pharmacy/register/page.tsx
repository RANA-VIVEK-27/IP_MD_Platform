'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';
import { ApiClient } from '../../../../lib/api';
import { IconShieldMedical, IconChevronLeft, IconChevronRight, IconCheckCircle, IconUpload, IconClipboardMedical } from '../../../../components/Icons';
import { LoadingSpinner } from '../../../../components/LoadingSpinner';

const TOTAL_STEPS = 8;

const STEPS = [
  { label: 'Organization', description: 'Identity details' },
  { label: 'Address', description: 'Location information' },
  { label: 'Business', description: 'Registration & tax' },
  { label: 'Licensing', description: 'Drug/pharmacy license' },
  { label: 'Pharmacist', description: 'Responsible pharmacist' },
  { label: 'Documents', description: 'Upload documents' },
  { label: 'Declaration', description: 'Terms & conditions' },
  { label: 'Submit', description: 'Review & submit' },
];

interface PharmacyFormData {
  legalName: string;
  tradeName: string;
  businessType: string;
  pharmacyType: string;
  email: string;
  password: string;
  confirmPassword: string;
  registeredAddress: string;
  operationalAddress: string;
  city: string;
  state: string;
  district: string;
  pincode: string;
  businessRegistration: string;
  gstin: string;
  licenseType: string;
  licenseNumber: string;
  licenseIssuingAuthority: string;
  licenseIssueDate: string;
  licenseExpiryDate: string;
  licenseDocument: File | null;
  pharmacistName: string;
  pharmacistRegNumber: string;
  pharmacistCouncil: string;
  pharmacistCertificate: File | null;
  documents: File[];
  declarationAccepted: boolean;
  confirmAccuracy: boolean;
}

const initialFormData: PharmacyFormData = {
  legalName: '',
  tradeName: '',
  businessType: '',
  pharmacyType: 'retail',
  email: '',
  password: '',
  confirmPassword: '',
  registeredAddress: '',
  operationalAddress: '',
  city: '',
  state: '',
  district: '',
  pincode: '',
  businessRegistration: '',
  gstin: '',
  licenseType: '',
  licenseNumber: '',
  licenseIssuingAuthority: '',
  licenseIssueDate: '',
  licenseExpiryDate: '',
  licenseDocument: null,
  pharmacistName: '',
  pharmacistRegNumber: '',
  pharmacistCouncil: '',
  pharmacistCertificate: null,
  documents: [],
  declarationAccepted: false,
  confirmAccuracy: false,
};

export default function PharmacyRegisterPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PharmacyFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/pharmacy/dashboard');
    }
  }, [user, isLoading, router]);

  const updateField = (field: keyof PharmacyFormData, value: string | boolean | File | File[] | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.legalName.trim()) newErrors.legalName = 'Legal name is required';
      if (!formData.businessType) newErrors.businessType = 'Business type is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }
    if (step === 2) {
      if (!formData.registeredAddress.trim()) newErrors.registeredAddress = 'Registered address is required';
      if (!formData.city.trim()) newErrors.city = 'City is required';
      if (!formData.state.trim()) newErrors.state = 'State is required';
      if (!formData.pincode.trim()) newErrors.pincode = 'Pincode is required';
    }
    if (step === 4) {
      if (!formData.licenseType.trim()) newErrors.licenseType = 'License type is required';
      if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'License number is required';
      if (!formData.licenseIssuingAuthority.trim()) newErrors.licenseIssuingAuthority = 'Issuing authority is required';
      if (!formData.licenseIssueDate) newErrors.licenseIssueDate = 'Issue date is required';
      if (!formData.licenseExpiryDate) newErrors.licenseExpiryDate = 'Expiry date is required';
    }
    if (step === 5) {
      if (!formData.pharmacistName.trim()) newErrors.pharmacistName = 'Pharmacist name is required';
      if (!formData.pharmacistRegNumber.trim()) newErrors.pharmacistRegNumber = 'Registration number is required';
      if (!formData.pharmacistCouncil.trim()) newErrors.pharmacistCouncil = 'State pharmacy council is required';
    }
    if (step === 7) {
      if (!formData.declarationAccepted) newErrors.declarationAccepted = 'You must accept the declaration';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!formData.confirmAccuracy) {
      setErrors({ confirmAccuracy: 'You must confirm the accuracy of the provided information' });
      return;
    }
    setSubmitting(true);
    try {
      await ApiClient.register({
        email: formData.email,
        password: formData.password,
        full_name: formData.legalName,
        role: 'pharmacy_staff_owned',
        license_number: formData.licenseNumber,
        pharmacy_details: {
          pharmacy_name: formData.legalName,
          trade_name: formData.tradeName,
          business_type: formData.businessType,
          address: {
            full_address: formData.registeredAddress,
            operational_address: formData.operationalAddress,
            city: formData.city,
            state: formData.state,
            district: formData.district,
            pincode: formData.pincode,
          },
          gstin: formData.gstin,
        },
      });
      setSubmitted(true);
      setTimeout(() => router.replace('/professional/status'), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setErrors({ submit: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || user) {
    return <LoadingSpinner text="Loading registration form..." />;
  }

  if (submitted) {
    return (
      <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px', padding: 'var(--sp-8)' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--sp-5)' }}>
            <IconCheckCircle size={36} style={{ color: 'var(--success)' }} />
          </div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-heading)', marginBottom: 'var(--sp-2)' }}>Pharmacy Registration Submitted!</h2>
          <p style={{ fontSize: 'var(--text-md)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-5)', lineHeight: 1.6 }}>
            Thank you! Your pharmacy registration for <strong>{formData.legalName}</strong> has been successfully submitted for review.
          </p>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-5)', textAlign: 'left' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-heading)', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>What happens next:</p>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>1.</span>
                Our compliance team will review your pharmacy license and business details
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>2.</span>
                You will receive an email notification once your pharmacy is verified
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>3.</span>
                After approval, you can manage medicines, orders, and pharmacist staff
              </li>
            </ul>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Redirecting to status page...</p>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = { height: '44px', fontSize: 'var(--text-base)' };

  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="legalName">Legal Name of Organization</label>
        <input id="legalName" type="text" className="input" style={inputStyle} placeholder="e.g. HealthPlus Pharmaceuticals Pvt. Ltd." value={formData.legalName} onChange={e => updateField('legalName', e.target.value)} />
        {errors.legalName && <span className="form-error">{errors.legalName}</span>}
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="tradeName">Trade Name (if different)</label>
        <input id="tradeName" type="text" className="input" style={inputStyle} placeholder="e.g. HealthPlus Pharmacy" value={formData.tradeName} onChange={e => updateField('tradeName', e.target.value)} />
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="pharmacyEmail">Account Email</label>
        <input id="pharmacyEmail" type="email" className="input" style={inputStyle} placeholder="admin@pharmacy.com" value={formData.email} onChange={e => updateField('email', e.target.value)} />
        {errors.email && <span className="form-error">{errors.email}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="pharmacyPassword">Password</label>
          <input id="pharmacyPassword" type="password" className="input" style={inputStyle} placeholder="Min 6 characters" value={formData.password} onChange={e => updateField('password', e.target.value)} minLength={6} />
          {errors.password && <span className="form-error">{errors.password}</span>}
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="pharmacyConfirmPassword">Confirm Password</label>
          <input id="pharmacyConfirmPassword" type="password" className="input" style={inputStyle} placeholder="Re-enter password" value={formData.confirmPassword} onChange={e => updateField('confirmPassword', e.target.value)} minLength={6} />
          {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="bizType">Business Type</label>
          <select id="bizType" className="input" style={inputStyle} value={formData.businessType} onChange={e => updateField('businessType', e.target.value)}>
            <option value="">Select type</option>
            <option value="sole_proprietorship">Sole Proprietorship</option>
            <option value="partnership">Partnership</option>
            <option value="private_limited">Private Limited</option>
            <option value="llp">LLP</option>
            <option value="other">Other</option>
          </select>
          {errors.businessType && <span className="form-error">{errors.businessType}</span>}
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="pharmType">Pharmacy Type</label>
          <select id="pharmType" className="input" style={inputStyle} value={formData.pharmacyType} onChange={e => updateField('pharmacyType', e.target.value)}>
            <option value="retail">Retail Pharmacy</option>
            <option value="hospital">Hospital Pharmacy</option>
            <option value="chain">Chain Pharmacy</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="regAddr">Registered Address</label>
        <textarea id="regAddr" className="input textarea" placeholder="Full registered address" value={formData.registeredAddress} onChange={e => updateField('registeredAddress', e.target.value)} style={{ minHeight: '80px' }} />
        {errors.registeredAddress && <span className="form-error">{errors.registeredAddress}</span>}
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="opsAddr">Operational Address</label>
        <textarea id="opsAddr" className="input textarea" placeholder="Address where pharmacy operates (if different)" value={formData.operationalAddress} onChange={e => updateField('operationalAddress', e.target.value)} style={{ minHeight: '80px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-4)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="city">City</label>
          <input id="city" type="text" className="input" style={inputStyle} placeholder="e.g. Mumbai" value={formData.city} onChange={e => updateField('city', e.target.value)} />
          {errors.city && <span className="form-error">{errors.city}</span>}
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="state">State</label>
          <input id="state" type="text" className="input" style={inputStyle} placeholder="e.g. Maharashtra" value={formData.state} onChange={e => updateField('state', e.target.value)} />
          {errors.state && <span className="form-error">{errors.state}</span>}
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="district">District</label>
          <input id="district" type="text" className="input" style={inputStyle} placeholder="e.g. Mumbai City" value={formData.district} onChange={e => updateField('district', e.target.value)} />
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="pincode">Pincode</label>
        <input id="pincode" type="text" className="input" style={{ ...inputStyle, maxWidth: '200px' }} placeholder="e.g. 400001" value={formData.pincode} onChange={e => updateField('pincode', e.target.value)} />
        {errors.pincode && <span className="form-error">{errors.pincode}</span>}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="bizReg">Business Registration Number</label>
        <input id="bizReg" type="text" className="input" style={inputStyle} placeholder="e.g. CIN: U74999MH2020PTC123456" value={formData.businessRegistration} onChange={e => updateField('businessRegistration', e.target.value)} />
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="gstin">GSTIN</label>
        <input id="gstin" type="text" className="input" style={{ ...inputStyle, maxWidth: '300px' }} placeholder="e.g. 27AABCU9603R1ZM" value={formData.gstin} onChange={e => updateField('gstin', e.target.value)} />
        <span className="form-helper">Goods and Services Tax Identification Number</span>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="licType">License Type</label>
        <select id="licType" className="input" style={inputStyle} value={formData.licenseType} onChange={e => updateField('licenseType', e.target.value)}>
          <option value="">Select license type</option>
          <option value="drug_license">Drug License (Form 20/21)</option>
          <option value="retail">Retail Drug License</option>
          <option value="wholesale">Wholesale Drug License</option>
          <option value="manufacturing">Manufacturing License</option>
        </select>
        {errors.licenseType && <span className="form-error">{errors.licenseType}</span>}
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="licNum">License Number</label>
        <input id="licNum" type="text" className="input" style={inputStyle} placeholder="e.g. 20B-MH-123456" value={formData.licenseNumber} onChange={e => updateField('licenseNumber', e.target.value)} />
        {errors.licenseNumber && <span className="form-error">{errors.licenseNumber}</span>}
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="licAuth">Issuing Authority</label>
        <input id="licAuth" type="text" className="input" style={inputStyle} placeholder="e.g. FDA Maharashtra" value={formData.licenseIssuingAuthority} onChange={e => updateField('licenseIssuingAuthority', e.target.value)} />
        {errors.licenseIssuingAuthority && <span className="form-error">{errors.licenseIssuingAuthority}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="licIssue">Issue Date</label>
          <input id="licIssue" type="date" className="input" style={inputStyle} value={formData.licenseIssueDate} onChange={e => updateField('licenseIssueDate', e.target.value)} />
          {errors.licenseIssueDate && <span className="form-error">{errors.licenseIssueDate}</span>}
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="licExpiry">Expiry Date</label>
          <input id="licExpiry" type="date" className="input" style={inputStyle} value={formData.licenseExpiryDate} onChange={e => updateField('licenseExpiryDate', e.target.value)} />
          {errors.licenseExpiryDate && <span className="form-error">{errors.licenseExpiryDate}</span>}
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">License Document</label>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
          padding: 'var(--sp-4)', border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-md)', cursor: 'pointer',
          background: 'var(--bg-soft)',
        }}>
          <IconUpload size={20} style={{ color: 'var(--text-muted)' }} />
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
              {formData.licenseDocument ? formData.licenseDocument.name : 'Upload drug license document'}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>PDF, JPG or PNG (max 5MB)</div>
          </div>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => updateField('licenseDocument', e.target.files?.[0] || null)} />
        </label>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div style={{ padding: 'var(--sp-4)', background: 'var(--info-bg)', border: '1px solid var(--info-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--info)' }}>
        Every pharmacy must have a registered, responsible pharmacist whose credentials are verified.
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="phName">Responsible Pharmacist Name</label>
        <input id="phName" type="text" className="input" style={inputStyle} placeholder="e.g. Dr. Anjali Mehta" value={formData.pharmacistName} onChange={e => updateField('pharmacistName', e.target.value)} />
        {errors.pharmacistName && <span className="form-error">{errors.pharmacistName}</span>}
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="phReg">Registration Number</label>
        <input id="phReg" type="text" className="input" style={inputStyle} placeholder="e.g. MH-2018-7890" value={formData.pharmacistRegNumber} onChange={e => updateField('pharmacistRegNumber', e.target.value)} />
        {errors.pharmacistRegNumber && <span className="form-error">{errors.pharmacistRegNumber}</span>}
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="phCouncil">State Pharmacy Council</label>
        <input id="phCouncil" type="text" className="input" style={inputStyle} placeholder="e.g. Maharashtra State Pharmacy Council" value={formData.pharmacistCouncil} onChange={e => updateField('pharmacistCouncil', e.target.value)} />
        {errors.pharmacistCouncil && <span className="form-error">{errors.pharmacistCouncil}</span>}
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Registration Certificate</label>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
          padding: 'var(--sp-4)', border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-md)', cursor: 'pointer',
          background: 'var(--bg-soft)',
        }}>
          <IconUpload size={20} style={{ color: 'var(--text-muted)' }} />
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
              {formData.pharmacistCertificate ? formData.pharmacistCertificate.name : 'Upload pharmacist registration certificate'}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>PDF, JPG or PNG (max 5MB)</div>
          </div>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => updateField('pharmacistCertificate', e.target.files?.[0] || null)} />
        </label>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-2)' }}>
        Upload all required supporting documents for your pharmacy registration.
      </p>
      {['Business Registration Certificate', 'GST Certificate', 'Proof of Address', 'Insurance Certificate'].map((docName, i) => (
        <label key={i} style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
          padding: 'var(--sp-3) var(--sp-4)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', cursor: 'pointer',
          background: 'var(--bg-surface)',
        }}>
          <IconUpload size={18} style={{ color: 'var(--text-muted)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>{docName}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>PDF, JPG or PNG (max 5MB)</div>
          </div>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => {
            const files = [...formData.documents];
            const selected = e.target.files?.[0];
            if (selected) {
              files[i] = selected;
            }
            updateField('documents', files.filter(Boolean));
          }} />
        </label>
      ))}
    </div>
  );

  const renderStep7 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <div style={{ padding: 'var(--sp-5)', background: 'var(--bg-soft)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: 'var(--sp-3)' }}>Declaration</h4>
        <p style={{ marginBottom: 'var(--sp-3)' }}>
          I, the undersigned, hereby declare that:
        </p>
        <ol style={{ paddingLeft: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <li>All information provided in this registration is true, complete, and accurate to the best of my knowledge.</li>
          <li>The pharmacy holds all required licenses and permits as mandated by applicable laws and regulations.</li>
          <li>The responsible pharmacist named herein is currently registered with the relevant State Pharmacy Council.</li>
          <li>We agree to comply with all applicable healthcare regulations, drug safety protocols, and platform policies.</li>
          <li>We understand that any misrepresentation may result in rejection of this application and potential legal consequences.</li>
          <li>We consent to verification of all provided credentials and documents by the platform administrators.</li>
        </ol>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)', cursor: 'pointer' }}>
          <input type="checkbox" checked={formData.declarationAccepted} onChange={e => updateField('declarationAccepted', e.target.checked)} style={{ marginTop: '3px', accentColor: 'var(--primary)' }} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            I have read and accept the above declaration and the platform&apos;s Terms of Service and Privacy Policy.
          </span>
        </label>
        {errors.declarationAccepted && <span className="form-error">{errors.declarationAccepted}</span>}
      </div>
    </div>
  );

  const renderStep8 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      {[
        { label: 'Organization', items: [`Legal Name: ${formData.legalName}`, `Trade Name: ${formData.tradeName || 'N/A'}`, `Business Type: ${formData.businessType || 'N/A'}`, `Pharmacy Type: ${formData.pharmacyType}`] },
        { label: 'Address', items: [`Registered: ${formData.registeredAddress}`, `City: ${formData.city}, State: ${formData.state}`, `Pincode: ${formData.pincode}`] },
        { label: 'License', items: [`Type: ${formData.licenseType}`, `Number: ${formData.licenseNumber}`, `Authority: ${formData.licenseIssuingAuthority}`, `Valid: ${formData.licenseIssueDate} to ${formData.licenseExpiryDate}`] },
        { label: 'Responsible Pharmacist', items: [`Name: ${formData.pharmacistName}`, `Reg No: ${formData.pharmacistRegNumber}`, `Council: ${formData.pharmacistCouncil}`] },
      ].map((section) => (
        <div key={section.label} style={{ padding: 'var(--sp-4)', background: 'var(--bg-soft)', borderRadius: 'var(--radius-md)' }}>
          <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-2)' }}>{section.label}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)', fontSize: 'var(--text-sm)' }}>
            {section.items.map((item, i) => (
              <div key={i} style={{ color: 'var(--text-primary)' }}>{item}</div>
            ))}
          </div>
        </div>
      ))}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)', cursor: 'pointer' }}>
          <input type="checkbox" checked={formData.confirmAccuracy} onChange={e => updateField('confirmAccuracy', e.target.checked)} style={{ marginTop: '3px', accentColor: 'var(--primary)' }} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            I confirm that all information provided is accurate and complete. I understand that providing false information may result in rejection of this application.
          </span>
        </label>
        {errors.confirmAccuracy && <span className="form-error">{errors.confirmAccuracy}</span>}
      </div>
      {errors.submit && (
        <div style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>
          {errors.submit}
        </div>
      )}
    </div>
  );

  const stepRenderers: Record<number, () => React.ReactNode> = {
    1: renderStep1,
    2: renderStep2,
    3: renderStep3,
    4: renderStep4,
    5: renderStep5,
    6: renderStep6,
    7: renderStep7,
    8: renderStep8,
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', background: 'var(--bg-page)' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0B6E6B 0%, #095A58 40%, #0F2B3C 100%)',
        padding: 'var(--sp-8) var(--sp-6)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 40%, rgba(20, 163, 199, 0.12) 0%, transparent 50%)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          <Link href="/professional" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)', color: 'rgba(255,255,255,0.7)', fontSize: 'var(--text-sm)', textDecoration: 'none', marginBottom: 'var(--sp-4)' }}>
            <IconChevronLeft size={14} /> Back to Portal
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconClipboardMedical size={28} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Pharmacy Registration</h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.6)' }}>Onboard your pharmacy to the network</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: 'var(--sp-6)' }}>
        {/* Step Indicator */}
        <div style={{ marginBottom: 'var(--sp-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
            {STEPS.map((step, i) => {
              const num = i + 1;
              const isActive = num === currentStep;
              const isCompleted = num < currentStep;
              return (
                <div key={step.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--text-xs)', fontWeight: 600,
                    background: isCompleted || isActive ? 'var(--primary)' : 'var(--bg-muted)',
                    color: isCompleted || isActive ? '#fff' : 'var(--text-muted)',
                    border: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  }}>
                    {isCompleted ? <IconCheckCircle size={14} /> : num}
                  </div>
                  <span style={{ fontSize: '10px', color: isActive ? 'var(--primary)' : 'var(--text-muted)', marginTop: 'var(--sp-1)', fontWeight: isActive ? 600 : 400, textAlign: 'center' }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ height: '2px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%`, background: 'var(--primary)', transition: 'width 300ms var(--ease)', borderRadius: 'var(--radius-pill)' }} />
          </div>
        </div>

        {/* Step Content */}
        <div className="card" style={{ padding: 'var(--sp-6)' }}>
          <div style={{ marginBottom: 'var(--sp-5)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: 'var(--sp-1)' }}>
              {STEPS[currentStep - 1].label}
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              {STEPS[currentStep - 1].description}
            </p>
          </div>

          {stepRenderers[currentStep]()}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--sp-6)', paddingTop: 'var(--sp-5)', borderTop: '1px solid var(--border-light)' }}>
            <button type="button" onClick={handleBack} disabled={currentStep === 1} className="btn btn-secondary" style={{ opacity: currentStep === 1 ? 0.5 : 1, pointerEvents: currentStep === 1 ? 'none' : 'auto' }}>
              <IconChevronLeft size={16} /> Previous
            </button>
            {currentStep < TOTAL_STEPS ? (
              <button type="button" onClick={handleNext} className="btn btn-primary">
                Next <IconChevronRight size={16} />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={submitting} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-2)' }}>
                {submitting ? (
                  <>
                    <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                    Submitting...
                  </>
                ) : 'Submit Registration'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
