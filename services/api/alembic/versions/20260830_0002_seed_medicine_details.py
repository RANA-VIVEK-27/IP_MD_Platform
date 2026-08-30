"""Seed medicine catalog with full details.

Revision ID: 20260830_0002
Revises: 20260830_0001
Create Date: 2026-08-30
"""
from alembic import op
import sqlalchemy as sql

revision = '20260830_0002'
down_revision = '20260830_0001'
branch_labels = None
depends_on = None

# Medicine data: (name, manufacturer, dosage_form, strength, pack_size, description, side_effects, contraindications, storage_conditions, drug_interactions)
MEDICINE_DATA = [
    ("Admenta", "Sun Pharma", "tablet", "10mg", "10 tablets", "Used to treat moderate to severe Alzheimer's disease", "Nausea, vomiting, diarrhea, headache, dizziness", "Hypersensitivity to memantine", "Store below 25°C", "Drugs that alkalinize urine (sodium bicarbonate, cimetidine) may increase memantine levels"),
    ("Albendazole 400mg", "GlaxoSmithKline", "tablet", "400mg", "1 tablet", "Antiparasitic used to treat worm infections", "Headache, nausea, vomiting, abdominal pain", "Pregnancy, hepatic echinococcosis with retinal involvement", "Store below 30°C", "Dexamethasone and cimetidine may increase albendazole levels"),
    ("Allegra 120mg", "Sanofi India", "tablet", "120mg", "10 tablets", "Non-drowsy antihistamine for allergic rhinitis and urticaria", "Headache, nausea, dizziness", "Severe renal impairment", "Store below 30°C", "No significant interactions with food or antacids"),
    ("Alprazolam 0.5mg", "Pfizer India", "tablet", "0.5mg", "10 tablets", "Benzodiazepine for anxiety and panic disorders", "Drowsiness, fatigue, impaired coordination", "Acute narrow-angle glaucoma, concurrent opioid use", "Store below 30°C, protect from light", "CNS depressants, CYP3A4 inhibitors (ketoconazole, itraconazole)"),
    ("Ambroxol Syrup 30mg/5ml", "Cipla", "syrup", "30mg/5ml", "100ml", "Mucolytic agent for productive cough", "Nausea, vomiting, diarrhea, stomach upset", "Peptic ulcer disease, severe hepatic impairment", "Store below 30°C", "No significant interactions reported"),
    ("Amlodipine 5mg", "Pfizer India", "tablet", "5mg", "10 tablets", "Calcium channel blocker for hypertension and angina", "Ankle edema, headache, flushing, dizziness", "Severe hypotension, cardiogenic shock", "Store below 30°C", "CYP3A4 inhibitors, simvastatin (limit dose), cyclosporine"),
    ("Amoxicillin 500mg", "GlaxoSmithKline", "capsule", "500mg", "10 capsules", "Broad-spectrum antibiotic for bacterial infections", "Diarrhea, nausea, skin rash", "Penicillin hypersensitivity, mononucleosis", "Store below 25°C", "Probenecid, methotrexate, warfarin monitoring"),
    ("Apple Cider Vinegar", "HealthKart", "liquid", "NA", "500ml", "Natural health supplement for digestion and weight management", "Throat irritation, dental erosion with excessive use", "Gastroparesis, peptic ulcer", "Store in cool dry place", "May reduce potassium levels with diuretics"),
    ("Atorvastatin 10mg", "Pfizer India", "tablet", "10mg", "10 tablets", "HMG-CoA reductase inhibitor for hyperlipidemia", "Muscle pain, joint pain, digestive issues", "Active liver disease, pregnancy, breastfeeding", "Store below 30°C", "CYP3A4 inhibitors, grapefruit juice, fibrates, niacin"),
    ("Atorvastatin 20mg", "Pfizer India", "tablet", "20mg", "10 tablets", "HMG-CoA reductase inhibitor for hyperlipidemia", "Muscle pain, joint pain, digestive issues", "Active liver disease, pregnancy, breastfeeding", "Store below 30°C", "CYP3A4 inhibitors, grapefruit juice, fibrates, niacin"),
    ("Azithromycin 500mg", "Zydus Cadila", "tablet", "500mg", "3 tablets", "Macrolide antibiotic for bacterial infections", "Diarrhea, nausea, abdominal pain, vomiting", "Hypersensitivity to macrolides, severe hepatic impairment", "Store below 30°C", "Antacids (reduce absorption), warfarin, digoxin"),
    ("Band-Aid Plaster", "Johnson & Johnson", "plaster", "NA", "10 pieces", "Adhesive bandage for minor wounds and cuts", "Skin irritation (rare)", "None", "Store in dry place", "None"),
    ("Becosules Capsule", "Pfizer India", "capsule", "NA", "30 capsules", "Vitamin B-complex supplement for nutritional deficiency", "Generally well tolerated, rare allergic reactions", "Hypersensitivity to B vitamins", "Store below 30°C", "Levodopa (reduced absorption)"),
    ("Betadine Garge", "Win Medicare", "gargle", "2%", "50ml", "Antiseptic gargle for throat infections", "Local irritation, allergic reactions (rare)", "Thyroid disorders, concurrent lithium therapy", "Store below 30°C", "May interfere with thyroid function tests"),
    ("Calpol 650mg", "GlaxoSmithKline", "tablet", "650mg", "10 tablets", "Analgesic and antipyretic for pain and fever", "Nausea, liver damage (overdose)", "Severe hepatic impairment, alcoholism", "Store below 25°C", "Warfarin (increased INR), isoniazid"),
    ("Carisoprodol 350mg", "Sanofi India", "tablet", "350mg", "10 tablets", "Muscle relaxant for musculoskeletal pain", "Drowsiness, dizziness, headache", "Porphyria, hypersensitivity to carisoprodol", "Store below 30°C", "CNS depressants, opioids, MAO inhibitors"),
    ("Cetirizine 10mg", "UCB India", "tablet", "10mg", "10 tablets", "Second-generation antihistamine for allergies", "Drowsiness, dry mouth, fatigue", "Severe renal impairment, hypersensitivity", "Store below 30°C", "Theophylline, CNS depressants"),
    ("Cetirizine + Ambroxol Syrup", "Cipla", "syrup", "5mg+15mg/5ml", "100ml", "Combination antihistamine and mucolytic for cough with allergy", "Drowsiness, nausea, dry mouth", "Severe renal impairment, peptic ulcer", "Store below 30°C", "CNS depressants, theophylline"),
    ("Ciprofloxacin 500mg", "Sun Pharma", "tablet", "500mg", "10 tablets", "Fluoroquinolone antibiotic for bacterial infections", "Nausea, diarrhea, headache, dizziness", "Pregnancy, breastfeeding, children under 12", "Store below 25°C", "Antacids, iron, calcium, theophylline, warfarin"),
    ("Clotrimazole Cream", "Bayer India", "cream", "1%", "20g", "Antifungal cream for skin and vaginal infections", "Local burning, itching, irritation", "Hypersensitivity to clotrimazole", "Store below 30°C", "No significant systemic interactions"),
    ("Combiflam Tablet", "Sanofi India", "tablet", "400mg+10mg", "10 tablets", "Combination NSAID+analgesic for pain and fever", "Gastric irritation, nausea, dizziness", "Peptic ulcer, severe renal impairment, pregnancy", "Store below 30°C", "Anticoagulants, methotrexate, lithium"),
    ("Crocin Advance", "GlaxoSmithKline", "tablet", "500mg", "10 tablets", "Analgesic and antipyretic for pain and fever", "Nausea, liver damage (overdose)", "Severe hepatic impairment", "Store below 25°C", "Warfarin, isoniazid"),
    ("Dolo 650", "Micro Labs", "tablet", "650mg", "10 tablets", "Analgesic and antipyretic for pain and fever", "Nausea, liver damage (overdose)", "Severe hepatic impairment", "Store below 25°C", "Warfarin, isoniazid"),
    ("Dulcoflex Tablet", "Abbott India", "tablet", "5mg", "10 tablets", "Stimulant laxative for constipation", "Abdominal cramps, diarrhea, electrolyte imbalance", "Intestinal obstruction, severe dehydration", "Store below 30°C", "Cardiac glycosides, antiarrhythmics"),
    ("Dolo Neurobion", "Sanofi India", "tablet", "NA", "10 tablets", "Vitamin B-complex + methylcobalamin for neuropathic pain", "Generally well tolerated", "Hypersensitivity to B vitamins", "Store below 30°C", "Levodopa (reduced absorption)"),
    ("Dexorange Syrup", "Franco Indian", "syrup", "NA", "200ml", "Iron supplement for iron deficiency anemia", "Constipation, nausea, dark stools", "Hemochromatosis, thalassemia", "Store below 30°C", "Antacids, tetracyclines, penicillamine"),
    ("Dexorange Capsule", "Franco Indian", "capsule", "NA", "30 capsules", "Iron + folic acid + vitamin B12 supplement for anemia", "Constipation, nausea, dark stools", "Hemochromatosis, thalassemia", "Store below 30°C", "Antacids, tetracyclines, penicillamine"),
    ("Febuxostat 40mg", "Zydus Cadila", "tablet", "40mg", "10 tablets", "Xanthine oxidase inhibitor for gout", "Nausea, joint pain, rash", "Severe hepatic impairment, organ transplant recipients", "Store below 30°C", "Mercaptopurine, azathioprine (reduce dose)"),
    ("Gelusil MPS", "Pfizer India", "suspension", "NA", "170ml", "Antacid for acid reflux and heartburn", "Constipation, diarrhea", "Hypophosphatemia", "Store below 30°C", "Tetracyclines, fluoroquinolones (reduce absorption)"),
    ("Gudcef CV 200mg", "Lupin", "tablet", "200mg", "10 tablets", "Cephalosporin antibiotic with clavulanic acid", "Diarrhea, nausea, skin rash", "Penicillin hypersensitivity, hepatic impairment", "Store below 30°C", "Probenecid, warfarin monitoring"),
    ("Hexidine Mouthwash", "Cipla", "mouthwash", "0.12%", "100ml", "Chlorhexidine antiseptic mouthwash for oral hygiene", "Tooth staining, taste alteration", "Hypersensitivity to chlorhexidine", "Store below 30°C", "No significant interactions"),
    ("Ibugesic Plus Tablet", "Cipla", "tablet", "400mg+10mg", "10 tablets", "Combination NSAID+analgesic for pain and fever", "Gastric irritation, nausea, dizziness", "Peptic ulcer, severe renal impairment, pregnancy", "Store below 30°C", "Anticoagulants, methotrexate, lithium"),
    ("Itraconazole 100mg", "Cipla", "capsule", "100mg", "10 capsules", "Antifungal for systemic and superficial fungal infections", "Nausea, headache, dizziness", "Hepatic impairment, cardiac failure, pregnancy", "Store below 30°C", "CYP3A4 substrates, midazolam, triazolam"),
    ("Levocetirizine 5mg", "Sun Pharma", "tablet", "5mg", "10 tablets", "Third-generation antihistamine for allergic conditions", "Drowsiness, dry mouth, fatigue", "Severe renal impairment", "Store below 30°C", "Theophylline, CNS depressants"),
    ("Montair LC", "Cipla", "tablet", "10mg+500mg", "10 tablets", "Combination montelukast+levocetirizine for allergic rhinitis", "Headache, dizziness, dry mouth", "Hypersensitivity to montelukast", "Store below 30°C", "Phenobarbital, rifampin (reduce montelukast levels)"),
    ("Metformin 500mg", "USV India", "tablet", "500mg", "10 tablets", "Biguanide for type 2 diabetes mellitus", "Nausea, diarrhea, metallic taste, lactic acidosis (rare)", "Severe renal impairment, metabolic acidosis", "Store below 30°C", "Alcohol, carbonic anhydrase inhibitors, contrast dye"),
    ("Nexpro 40mg", "Dr Reddy's", "tablet", "40mg", "10 tablets", "Proton pump inhibitor for acid reflux and ulcers", "Headache, nausea, diarrhea", "Hypersensitivity to esomeprazole", "Store below 30°C", "Clopidogrel (reduced activation), methotrexate"),
    ("Nitrofurantoin 100mg", "Sanofi India", "capsule", "100mg", "10 capsules", "Antibiotic for urinary tract infections", "Nausea, headache, pulmonary toxicity (rare)", "G6PD deficiency, severe renal impairment, pregnancy near term", "Store below 25°C", "Antacids, magnesium trisilicate (reduce absorption)"),
    ("Omeprazole 20mg", "Dr Reddy's", "capsule", "20mg", "10 capsules", "Proton pump inhibitor for acid reflux and ulcers", "Headache, nausea, diarrhea", "Hypersensitivity to omeprazole", "Store below 30°C", "Clopidogrel, methotrexate, diazepam"),
    ("Oseltamivir 75mg", "Cipla", "capsule", "75mg", "10 capsules", "Antiviral for influenza treatment and prophylaxis", "Nausea, vomiting, headache", "Hypersensitivity to oseltamivir", "Store below 25°C", "Live attenuated influenza vaccine (avoid during treatment)"),
    ("Pan 40 Tablet", "Alkem Labs", "tablet", "40mg", "10 tablets", "Proton pump inhibitor for acid reflux and ulcers", "Headache, nausea, diarrhea", "Hypersensitivity to pantoprazole", "Store below 30°C", "Methotrexate, clopidogrel"),
    ("Paracetamol 650mg", "Various", "tablet", "650mg", "10 tablets", "Analgesic and antipyretic for pain and fever", "Nausea, liver damage (overdose)", "Severe hepatic impairment", "Store below 25°C", "Warfarin, isoniazid"),
    ("Rabeprazole 20mg", "Dr Reddy's", "tablet", "20mg", "10 tablets", "Proton pump inhibitor for acid reflux and ulcers", "Headache, nausea, diarrhea", "Hypersensitivity to rabeprazole", "Store below 30°C", "Methotrexate, clopidogrel"),
    ("Ramipril 5mg", "Sanofi India", "tablet", "5mg", "10 tablets", "ACE inhibitor for hypertension and heart failure", "Dry cough, dizziness, hyperkalemia", "Pregnancy, bilateral renal artery stenosis, angioedema history", "Store below 30°C", "Potassium-sparing diuretics, NSAIDs, lithium"),
    ("Ranitidine 150mg", "GlaxoSmithKline", "tablet", "150mg", "10 tablets", "H2 receptor antagonist for acid reflux and ulcers", "Headache, dizziness, constipation", "Hypersensitivity to ranitidine (withdrawn in some countries)", "Store below 25°C", "Antacids, ketoconazole, triazolam"),
    ("Sinarest Tablet", "Centaur Pharma", "tablet", "NA", "10 tablets", "Combination antihistamine+decongestant+analgesic for cold", "Drowsiness, dry mouth, nausea", "Severe hypertension, MAO inhibitor use", "Store below 30°C", "MAO inhibitors, CNS depressants, thyroid hormones"),
    ("Sumo Tablet", "Lupin", "tablet", "400mg+10mg", "10 tablets", "Combination NSAID+analgesic for pain and fever", "Gastric irritation, nausea, dizziness", "Peptic ulcer, severe renal impairment, pregnancy", "Store below 30°C", "Anticoagulants, methotrexate, lithium"),
    ("Telsartan 40mg", "Dr Reddy's", "tablet", "40mg", "10 tablets", "ARB for hypertension", "Dizziness, hyperkalemia, back pain", "Pregnancy, bilateral renal artery stenosis", "Store below 30°C", "Potassium supplements, NSAIDs, lithium"),
    ("Tetmosol Soap", "Sanofi India", "soap", "1%", "75g", "Antibacterial soap for skin infections", "Local skin irritation (rare)", "Hypersensitivity to permethrin", "Store below 30°C", "No significant interactions"),
    ("Tobramycin Eye Drops", "Cipla", "drops", "0.3%", "5ml", "Aminoglycoside antibiotic for eye infections", "Local eye irritation, allergic reactions", "Hypersensitivity to aminoglycosides", "Store below 25°C", "Other eye drops (wait 5 minutes between)"),
    ("Trustone Forte Tablet", "Alkem Labs", "tablet", "500mg+5mg", "10 tablets", "Combination analgesic for dental and musculoskeletal pain", "Gastric irritation, dizziness", "Peptic ulcer, severe renal impairment", "Store below 30°C", "Anticoagulants, methotrexate"),
    ("Urimax 0.4mg", "Cipla", "capsule", "0.4mg", "10 capsules", "Alpha-blocker for benign prostatic hyperplasia", "Dizziness, headache, postural hypotension", "Hypersensitivity to tamsulosin", "Store below 30°C", "CYP3A4 inhibitors, strong CYP3A4 inhibitors"),
    ("Valsartan 80mg", "Novartis India", "tablet", "80mg", "10 tablets", "ARB for hypertension and heart failure", "Dizziness, hyperkalemia, fatigue", "Pregnancy, bilateral renal artery stenosis", "Store below 30°C", "Potassium-sparing diuretics, NSAIDs, lithium"),
    ("Zifi 200mg", "FDC India", "tablet", "200mg", "10 tablets", "Third-generation cephalosporin antibiotic", "Diarrhea, nausea, headache", "Hypersensitivity to cephalosporins", "Store below 30°C", "Probenecid, warfarin monitoring"),
    ("Zincovit Tablet", "Apex Labs", "tablet", "NA", "30 tablets", "Multivitamin and mineral supplement", "Generally well tolerated", "Hypersensitivity to any ingredient", "Store below 30°C", "Tetracyclines (reduce zinc absorption)"),
]


def upgrade() -> None:
    conn = op.get_bind()
    for name, manufacturer, dosage_form, strength, pack_size, description, side_effects, contraindications, storage_conditions, drug_interactions in MEDICINE_DATA:
        conn.execute(
            sql.text(
                """
                UPDATE medicine_catalog_items
                SET
                    manufacturer = :manufacturer,
                    dosage_form = :dosage_form,
                    strength = :strength,
                    pack_size = :pack_size,
                    description = :description,
                    side_effects = :side_effects,
                    contraindications = :contraindications,
                    storage_conditions = :storage_conditions,
                    drug_interactions = :drug_interactions
                WHERE name = :name
                """
            ),
            {
                "name": name,
                "manufacturer": manufacturer,
                "dosage_form": dosage_form,
                "strength": strength,
                "pack_size": pack_size,
                "description": description,
                "side_effects": side_effects,
                "contraindications": contraindications,
                "storage_conditions": storage_conditions,
                "drug_interactions": drug_interactions,
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    for name, _, _, _, _, _, _, _, _, _ in MEDICINE_DATA:
        conn.execute(
            sql.text(
                """
                UPDATE medicine_catalog_items
                SET
                    manufacturer = NULL,
                    dosage_form = NULL,
                    strength = NULL,
                    pack_size = NULL,
                    description = NULL,
                    side_effects = NULL,
                    contraindications = NULL,
                    storage_conditions = NULL,
                    drug_interactions = NULL
                WHERE name = :name
                """
            ),
            {"name": name},
        )
