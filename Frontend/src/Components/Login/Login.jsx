import React, { useState } from 'react';
import './Login.css';
import { BACKEND_API_URL } from '../../util';

// Hardcoded hospital data for the dropdown
const hospitalData = [
    { "name": "Amrita Hospital, Faridabad" },
    { "name": "Accord Superspeciality Hospital" },
    { "name": "AIIMS, New Delhi" },
    { "name": "Artemis Hospital" },
    { "name": "Asian Institute of Medical Sciences" },
    { "name": "Batra Hospital & Medical Research Centre" },
    { "name": "BLK-Max Super Speciality Hospital" },
    { "name": "CK Birla Hospital, Gurugram" },
    { "name": "ESI Medical College & Hospital" },
    { "name": "Fortis Escorts Hospital" },
    { "name": "Fortis Flt. Lt. Rajan Dhall Hospital, Vasant Kunj" },
    { "name": "Fortis Hospital, Noida" },
    { "name": "Fortis Memorial Research Institute" },
    { "name": "Holy Family Hospital" },
    { "name": "Medicheck Ortho Superspeciality Hospital" },
    { "name": "Batra Heart & Multispecialty Hospital" },
    { "name": "Marengo Asia Hospitals, Faridabad" },
    { "name": "Park Hospital, Faridabad" },
    { "name": "Tara Netralaya Faridabad (Run by Tara Sansthan, Udaipur, Raj)" },
    { "name": "Indian Spinal Injuries Centre" },
    { "name": "Indraprastha Apollo Hospitals" },
    { "name": "Jaypee Hospital" },
    { "name": "Kailash Hospital" },
    { "name": "Manipal Hospital, Dwarka" },
    { "name": "Max Healthcare Hospital, Saket" },
    { "name": "Max Hospital, Noida" },
    { "name": "Max Super Speciality Hospital, Patparganj" },
    { "name": "Max Super Speciality Hospital, Vaishali" },
    { "name": "Medanta - The Medicity" },
    { "name": "Metro Heart Institute" },
    { "name": "Moolchand Medcity" },
    { "name": "Paras Hospital, Gurugram" },
    { "name": "QRG Health City" },
    { "name": "Safdarjung Hospital" },
    { "name": "Sarvodaya Hospital" },
    { "name": "Sharda Hospital" },
    { "name": "Sir Ganga Ram Hospital" },
    { "name": "Venkateshwar Hospital" },
    { "name": "W Pratiksha Hospital" },
    { "name": "Yashoda Super Speciality Hospital, Kaushambi" },
    { "name": "Yatharth Super Speciality Hospital, Greater Noida" }
];


const Login = () => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [role, setRole] = useState('patient');

    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [registerData, setRegisterData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        hospitalName: '',
        designation: '',
        gender: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const API_BASE_URL = BACKEND_API_URL;

    const handleLoginChange = (e) => {
        setLoginData({ ...loginData, [e.target.name]: e.target.value });
    };

    const handleRegisterChange = (e) => {
        setRegisterData({ ...registerData, [e.target.name]: e.target.value });
    };

    const handleRoleChange = (e) => {
        const newRole = e.target.value;
        setRole(newRole);
        // Reset conditional fields when role changes
        setRegisterData(prevData => ({
            ...prevData,
            hospitalName: newRole === 'patient' ? '' : prevData.hospitalName,
            designation: newRole !== 'doctor' ? '' : prevData.designation,
            gender: newRole !== 'doctor' ? '' : prevData.gender,
        }));
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to login');

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));

            if (data.role === 'helpdesk') {
                window.location.href = '/helpdesk-dashboard';
            } else {
                window.location.href = '/';
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        const payload = {
            name: registerData.name,
            email: registerData.email,
            phone: registerData.phone,
            password: registerData.password,
            role: role
        };

        if (role === 'doctor' || role === 'helpdesk') {
            payload.hospitalName = registerData.hospitalName;
        }
        if (role === 'doctor') {
            payload.designation = registerData.designation;
            payload.gender = registerData.gender;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to register');
            
            setIsLoginView(true);
            setError(''); 
            
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card">
                
                <div className="auth-header">
                    <img
                        src="/36cc9f43-2946-4fc0-a653-e9ce37b830fb.png"
                        alt="Medicare+ Logo"
                        className="auth-logo"
                    />
                </div>

                <div className={`auth-form-container ${isLoginView ? 'active' : ''}`}>
                    <form onSubmit={handleLoginSubmit} className="auth-form">
                        <h2 className="form-title">Welcome Back</h2>
                        <p className="form-subtitle">Sign in to continue to Medicare+</p>
                        {error && isLoginView && <p className="error-message">{error}</p>}

                        <div className="input-group">
                            <label htmlFor="login-email">Email Address</label>
                            <input id="login-email" name="email" type="email" required onChange={handleLoginChange} value={loginData.email} />
                        </div>
                        <div className="input-group">
                            <label htmlFor="login-password">Password</label>
                            <input id="login-password" name="password" type="password" required onChange={handleLoginChange} value={loginData.password} />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                        <p className="toggle-text">
                            Don't have an account?{' '}
                            <span onClick={() => { setIsLoginView(false); setError(''); }}>Sign Up</span>
                        </p>
                    </form>
                </div>

                <div className={`auth-form-container ${!isLoginView ? 'active' : ''}`}>
                    <form onSubmit={handleRegisterSubmit} className="auth-form">
                        <h2 className="form-title">Create Account</h2>
                        <p className="form-subtitle">Get started with your health journey</p>
                        {error && !isLoginView && <p className="error-message">{error}</p>}

                        <div className="input-group">
                            <label htmlFor="reg-name">Full Name</label>
                            <input id="reg-name" name="name" type="text" required onChange={handleRegisterChange} value={registerData.name} />
                        </div>
                        <div className="input-group">
                            <label htmlFor="reg-email">Email Address</label>
                            <input id="reg-email" name="email" type="email" required onChange={handleRegisterChange} value={registerData.email} />
                        </div>
                        <div className="input-group">
                            <label htmlFor="reg-phone">Phone Number</label>
                            <input id="reg-phone" name="phone" type="tel" required onChange={handleRegisterChange} value={registerData.phone} />
                        </div>
                        <div className="input-group">
                            <label htmlFor="reg-password">Password</label>
                            <input id="reg-password" name="password" type="password" required onChange={handleRegisterChange} value={registerData.password} />
                        </div>
                        <div className="input-group">
                            <label htmlFor="role">Register As</label>
                            <select id="role" name="role" value={role} onChange={handleRoleChange}>
                                <option value="patient">Patient</option>
                                <option value="doctor">Doctor</option>
                                <option value="helpdesk">Helpdesk</option>
                            </select>
                        </div>

                        <div className={`conditional-field ${role !== 'patient' ? 'visible' : ''}`}>
                            <div className="input-group">
                                <label htmlFor="hospitalName">Hospital Name</label>
                                <select 
                                    id="hospitalName" 
                                    name="hospitalName" 
                                    onChange={handleRegisterChange} 
                                    value={registerData.hospitalName} 
                                    required={role !== 'patient'}>
                                    <option value="">Select a hospital...</option>
                                    {hospitalData.map((hospital) => (
                                        <option key={hospital.name} value={hospital.name}>
                                            {hospital.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className={`conditional-field ${role === 'doctor' ? 'visible' : ''}`}>
                            <div className="input-group">
                                <label htmlFor="designation">Designation</label>
                                <input 
                                    id="designation" 
                                    name="designation" 
                                    type="text" 
                                    placeholder="e.g., Cardiologist, General Physician"
                                    onChange={handleRegisterChange} 
                                    value={registerData.designation} 
                                    required={role === 'doctor'}/>
                            </div>
                        </div>
                        <div className={`conditional-field ${role === 'doctor' ? 'visible' : ''}`}>
                            <div className="input-group">
                                <label htmlFor="gender">Gender</label>
                                <select 
                                    id="gender" 
                                    name="gender" 
                                    onChange={handleRegisterChange} 
                                    value={registerData.gender} 
                                    required={role === 'doctor'}>
                                    <option value="">Select gender...</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                        <p className="toggle-text">
                            Already have an account?{' '}
                            <span onClick={() => { setIsLoginView(true); setError(''); }}>Sign In</span>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;