'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';
import { ApiClient } from '../../../../lib/api';
import { IconShieldMedical, IconHeartbeat, IconChevronLeft, IconChevronRight, IconCheckCircle, IconUpload, IconStethoscope } from '../../../../components/Icons';
import { LoadingSpinner } from '../../../../components/LoadingSpinner';

const TOTAL_STEPS = 5;

const STEPS = [
  { label: 'Identity', description: 'Personal information' },
  { label: 'Registration', description: 'Medical registration' },
  { label: 'Qualification', description: 'Education & specialization' },
  { label: 'Practice', description: 'Practice details' },
  { label: 'Review', description: 'Verify & submit' },
];

interface DoctorFormData {
  fullName: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  mobile: string;
  professionalEmail: string;
  address: string;
  registrationAuthority: string;
  stateMedicalCouncil: string;
  medicalRegistrationNumber: string;
  registrationDate: string;
  certificateFile: File | null;
  primaryQualification: string;
  university: string;
  graduationYear: string;
  specialization: string;
  additionalDocuments: File | null;
  clinicHospital: string;
  facilityAssociation: string;
  practiceAddress: string;
  consultationType: string;
  professionalContact: string;
  confirmAccuracy: boolean;
}

const initialFormData: DoctorFormData = {
  fullName: '',
  password: '',
  confirmPassword: '',
  dateOfBirth: '',
  mobile: '',
  professionalEmail: '',
  address: '',
  registrationAuthority: '',
  stateMedicalCouncil: '',
  medicalRegistrationNumber: '',
  registrationDate: '',
  certificateFile: null,
  primaryQualification: '',
  university: '',
  graduationYear: '',
  specialization: '',
  additionalDocuments: null,
  clinicHospital: '',
  facilityAssociation: '',
  practiceAddress: '',
  consultationType: 'in_person',
  professionalContact: '',
  confirmAccuracy: false,
};

export default function DoctorRegisterPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DoctorFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/doctor');
    }
  }, [user, isLoading, router]);

  const updateField = (field: keyof DoctorFormData, value: string | boolean | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
      if (!formData.mobile.trim()) newErrors.mobile = 'Mobile number is required';
      if (!formData.professionalEmail.trim()) newErrors.professionalEmail = 'Professional email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.professionalEmail)) newErrors.professionalEmail = 'Invalid email format';
      if (!formData.address.trim()) newErrors.address = 'Address is required';
    }
    if (step === 2) {
      if (!formData.registrationAuthority.trim()) newErrors.registrationAuthority = 'Registration authority is required';
      if (!formData.stateMedicalCouncil.trim()) newErrors.stateMedicalCouncil = 'State medical council is required';
      if (!formData.medicalRegistrationNumber.trim()) newErrors.medicalRegistrationNumber = 'Registration number is required';
      if (!formData.registrationDate) newErrors.registrationDate = 'Registration date is required';
    }
    if (step === 3) {
      if (!formData.primaryQualification.trim()) newErrors.primaryQualification = 'Primary qualification is required';
      if (!formData.university.trim()) newErrors.university = 'University is required';
      if (!formData.graduationYear) newErrors.graduationYear = 'Graduation year is required';
      if (!formData.specialization.trim()) newErrors.specialization = 'Specialization is required';
    }
    if (step === 4) {
      if (!formData.clinicHospital.trim()) newErrors.clinicHospital = 'Clinic/Hospital name is required';
      if (!formData.practiceAddress.trim()) newErrors.practiceAddress = 'Practice address is required';
      if (!formData.professionalContact.trim()) newErrors.professionalContact = 'Professional contact is required';
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
        email: formData.professionalEmail,
        password: formData.password,
        full_name: formData.fullName,
        role: 'doctor',
        phone: formData.mobile,
        date_of_birth: formData.dateOfBirth,
        address: {
          full_address: formData.address,
          city: '',
          state: '',
          pincode: '',
        },
        license_number: formData.medicalRegistrationNumber,
        medical_registration: {
          registration_authority: formData.registrationAuthority,
          state_medical_council: formData.stateMedicalCouncil,
          medical_registration_number: formData.medicalRegistrationNumber,
          registration_date: formData.registrationDate,
        },
        qualification: {
          primary_qualification: formData.primaryQualification,
          university: formData.university,
          graduation_year: formData.graduationYear,
          specialization: formData.specialization,
        },
        practice_info: {
          clinic_hospital: formData.clinicHospital,
          facility_association: formData.facilityAssociation,
          practice_address: {
            full_address: formData.practiceAddress,
            city: '',
            state: '',
            pincode: '',
          },
          consultation_type: formData.consultationType,
          professional_contact: formData.professionalContact,
        },
      });
      setSubmitted(true);
      setTimeout(() => router.replace('/professional/login'), 5000);
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
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-heading)', marginBottom: 'var(--sp-2)' }}>Doctor Registration Submitted!</h2>
          <p style={{ fontSize: 'var(--text-md)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-5)', lineHeight: 1.6 }}>
            Thank you, {formData.fullName}! Your doctor registration has been successfully submitted for verification.
          </p>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-5)', textAlign: 'left' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-heading)', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>What happens next:</p>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>1.</span>
                Our team will review your credentials and medical registration
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>2.</span>
                You will receive an email notification once your account is verified
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>3.</span>
                After verification, sign in and upload your credentials for full access
              </li>
            </ul>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = { height: '44px', fontSize: 'var(--text-base)' };

  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="fullName">Full Legal Name</label>
        <input id="fullName" type="text" className="input" style={inputStyle} placeholder="e.g. Dr. Ramesh Gupta" value={formData.fullName} onChange={e => updateField('fullName', e.target.value)} />
        {errors.fullName && <span className="form-error">{errors.fullName}</span>}
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="password">Password</label>
        <input id="password" type="password" className="input" style={inputStyle} placeholder="Min 6 characters" value={formData.password} onChange={e => updateField('password', e.target.value)} minLength={6} />
        {errors.password && <span className="form-error">{errors.password}</span>}
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
        <input id="confirmPassword" type="password" className="input" style={inputStyle} placeholder="Re-enter your password" value={formData.confirmPassword} onChange={e => updateField('confirmPassword', e.target.value)} minLength={6} />
        {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="dob">Date of Birth</label>
          <input id="dob" type="date" className="input" style={inputStyle} value={formData.dateOfBirth} onChange={e => updateField('dateOfBirth', e.target.value)} />
          {errors.dateOfBirth && <span className="form-error">{errors.dateOfBirth}</span>}
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="mobile">Mobile Number</label>
          <input id="mobile" type="tel" className="input" style={inputStyle} placeholder="+91 XXXXX XXXXX" value={formData.mobile} onChange={e => updateField('mobile', e.target.value)} />
          {errors.mobile && <span className="form-error">{errors.mobile}</span>}
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="profEmail">Professional Email</label>
        <input id="profEmail" type="email" className="input" style={inputStyle} placeholder="you@hospital.com" value={formData.professionalEmail} onChange={e => updateField('professionalEmail', e.target.value)} />
        {errors.professionalEmail && <span className="form-error">{errors.professionalEmail}</span>}
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="address">Address</label>
        <textarea id="address" className="input textarea" placeholder="Your residential address" value={formData.address} onChange={e => updateField('address', e.target.value)} style={{ minHeight: '80px' }} />
        {errors.address && <span className="form-error">{errors.address}</span>}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="regAuth">Registration Authority</label>
        <input id="regAuth" type="text" className="input" style={inputStyle} placeholder="e.g. National Medical Commission" value={formData.registrationAuthority} onChange={e => updateField('registrationAuthority', e.target.value)} />
        {errors.registrationAuthority && <span className="form-error">{errors.registrationAuthority}</span>}
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="stateCouncil">State Medical Council</label>
        <input id="stateCouncil" type="text" className="input" style={inputStyle} placeholder="e.g. Maharashtra Medical Council" value={formData.stateMedicalCouncil} onChange={e => updateField('stateMedicalCouncil', e.target.value)} />
        {errors.stateMedicalCouncil && <span className="form-error">{errors.stateMedicalCouncil}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="regNum">Medical Registration Number</label>
          <input id="regNum" type="text" className="input" style={inputStyle} placeholder="e.g. MCI-2026-9812" value={formData.medicalRegistrationNumber} onChange={e => updateField('medicalRegistrationNumber', e.target.value)} />
          {errors.medicalRegistrationNumber && <span className="form-error">{errors.medicalRegistrationNumber}</span>}
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="regDate">Registration Date</label>
          <input id="regDate" type="date" className="input" style={inputStyle} value={formData.registrationDate} onChange={e => updateField('registrationDate', e.target.value)} />
          {errors.registrationDate && <span className="form-error">{errors.registrationDate}</span>}
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Medical Registration Certificate</label>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
          padding: 'var(--sp-4)', border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-md)', cursor: 'pointer',
          background: 'var(--bg-soft)', transition: 'border-color 150ms',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <IconUpload size={20} style={{ color: 'var(--text-muted)' }} />
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
              {formData.certificateFile ? formData.certificateFile.name : 'Upload certificate'}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>PDF, JPG or PNG (max 5MB)</div>
          </div>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => updateField('certificateFile', e.target.files?.[0] || null)} />
        </label>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="qual">Primary Qualification</label>
        <select id="qual" className="input" style={inputStyle} value={formData.primaryQualification} onChange={e => updateField('primaryQualification', e.target.value)}>
          <option value="">Select qualification</option>
          <option value="MBBS">MBBS</option>
          <option value="MD">MD</option>
          <option value="MS">MS</option>
          <option value="DNB">DNB</option>
          <option value="BAMS">BAMS</option>
          <option value="BHMS">BHMS</option>
          <option value="BDS">BDS</option>
          <option value="MDS">MDS</option>
          <option value="Other">Other</option>
        </select>
        {errors.primaryQualification && <span className="form-error">{errors.primaryQualification}</span>}
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="university">University / Institution</label>
        <input id="university" type="text" className="input" style={inputStyle} placeholder="e.g. All India Institute of Medical Sciences" value={formData.university} onChange={e => updateField('university', e.target.value)} />
        {errors.university && <span className="form-error">{errors.university}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="gradYear">Graduation Year</label>
          <input id="gradYear" type="number" className="input" style={inputStyle} placeholder="e.g. 2018" min="1950" max="2030" value={formData.graduationYear} onChange={e => updateField('graduationYear', e.target.value)} />
          {errors.graduationYear && <span className="form-error">{errors.graduationYear}</span>}
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="spec">Specialization</label>
          <input id="spec" type="text" className="input" style={inputStyle} placeholder="e.g. Cardiology" value={formData.specialization} onChange={e => updateField('specialization', e.target.value)} />
          {errors.specialization && <span className="form-error">{errors.specialization}</span>}
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Additional Documents</label>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
          padding: 'var(--sp-4)', border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-md)', cursor: 'pointer',
          background: 'var(--bg-soft)',
        }}>
          <IconUpload size={20} style={{ color: 'var(--text-muted)' }} />
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
              {formData.additionalDocuments ? formData.additionalDocuments.name : 'Upload additional qualification documents'}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Optional - PDF, JPG or PNG</div>
          </div>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => updateField('additionalDocuments', e.target.files?.[0] || null)} />
        </label>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="clinic">Clinic / Hospital Name</label>
        <input id="clinic" type="text" className="input" style={inputStyle} placeholder="e Apollo Hospitals" value={formData.clinicHospital} onChange={e => updateField('clinicHospital', e.target.value)} />
        {errors.clinicHospital && <span className="form-error">{errors.clinicHospital}</span>}
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="facility">Facility Association</label>
        <input id="facility" type="text" className="input" style={inputStyle} placeholder="e.g. Department of Cardiology" value={formData.facilityAssociation} onChange={e => updateField('facilityAssociation', e.target.value)} />
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="practiceAddr">Practice Address</label>
        <textarea id="practiceAddr" className="input textarea" placeholder="Full practice address" value={formData.practiceAddress} onChange={e => updateField('practiceAddress', e.target.value)} style={{ minHeight: '80px' }} />
        {errors.practiceAddress && <span className="form-error">{errors.practiceAddress}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="consultType">Consultation Type</label>
          <select id="consultType" className="input" style={inputStyle} value={formData.consultationType} onChange={e => updateField('consultationType', e.target.value)}>
            <option value="in_person">In-Person</option>
            <option value="teleconsultation">Teleconsultation</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="profContact">Professional Contact</label>
          <input id="profContact" type="text" className="input" style={inputStyle} placeholder="Phone or email" value={formData.professionalContact} onChange={e => updateField('professionalContact', e.target.value)} />
          {errors.professionalContact && <span className="form-error">{errors.professionalContact}</span>}
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      {/* Personal */}
      <div style={{ padding: 'var(--sp-4)', background: 'var(--bg-soft)', borderRadius: 'var(--radius-md)' }}>
        <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-3)' }}>Personal Information</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Name:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.fullName}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>DOB:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.dateOfBirth}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Mobile:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.mobile}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.professionalEmail}</span></div>
          <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--text-muted)' }}>Address:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.address}</span></div>
        </div>
      </div>
      {/* Medical Registration */}
      <div style={{ padding: 'var(--sp-4)', background: 'var(--bg-soft)', borderRadius: 'var(--radius-md)' }}>
        <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-3)' }}>Medical Registration</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Authority:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.registrationAuthority}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Council:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.stateMedicalCouncil}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Reg No:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.medicalRegistrationNumber}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Date:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.registrationDate}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Certificate:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.certificateFile?.name || 'Not uploaded'}</span></div>
        </div>
      </div>
      {/* Qualification */}
      <div style={{ padding: 'var(--sp-4)', background: 'var(--bg-soft)', borderRadius: 'var(--radius-md)' }}>
        <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-3)' }}>Qualification</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Qualification:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.primaryQualification}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>University:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.university}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Year:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.graduationYear}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Specialization:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.specialization}</span></div>
        </div>
      </div>
      {/* Practice */}
      <div style={{ padding: 'var(--sp-4)', background: 'var(--bg-soft)', borderRadius: 'var(--radius-md)' }}>
        <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-3)' }}>Practice Information</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Clinic:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.clinicHospital}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Type:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.consultationType.replace('_', ' ')}</span></div>
          <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--text-muted)' }}>Address:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.practiceAddress}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Contact:</span> <span style={{ color: 'var(--text-primary)' }}>{formData.professionalContact}</span></div>
        </div>
      </div>
      {/* Confirmation */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)', cursor: 'pointer' }}>
          <input type="checkbox" checked={formData.confirmAccuracy} onChange={e => updateField('confirmAccuracy', e.target.checked)} style={{ marginTop: '3px', accentColor: 'var(--primary)' }} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            I confirm that all information provided is accurate and complete. I understand that providing false information may result in rejection of my application and potential legal consequences.
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
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', background: 'var(--bg-page)' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1E6FB5 0%, #1A5A96 40%, #0F2B3C 100%)',
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
              <IconStethoscope size={28} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Doctor Registration</h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.6)' }}>Complete your professional credential verification</p>
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
                    width: '32px', height: '32px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--text-sm)', fontWeight: 600,
                    background: isCompleted ? 'var(--primary)' : isActive ? 'var(--primary)' : 'var(--bg-muted)',
                    color: isCompleted || isActive ? '#fff' : 'var(--text-muted)',
                    border: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                    transition: 'all 200ms',
                  }}>
                    {isCompleted ? <IconCheckCircle size={16} /> : num}
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: isActive ? 'var(--primary)' : 'var(--text-muted)', marginTop: 'var(--sp-1)', fontWeight: isActive ? 600 : 400 }}>
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

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--sp-6)', paddingTop: 'var(--sp-5)', borderTop: '1px solid var(--border-light)' }}>
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="btn btn-secondary"
              style={{ opacity: currentStep === 1 ? 0.5 : 1, pointerEvents: currentStep === 1 ? 'none' : 'auto' }}
            >
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
