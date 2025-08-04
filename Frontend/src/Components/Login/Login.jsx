import React, { useState } from 'react';
import './Login.css';
import { BACKEND_API_URL } from '../../util';

const Login = () => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [role, setRole] = useState('patient');

    // State for all form inputs
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [registerData, setRegisterData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        hospitalName: '',
        designation: ''
    });

    // State for API feedback
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
        setRole(e.target.value);
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
            if (!response.ok) {
                throw new Error(data.message || 'Failed to login');
            }
            console.log('Login successful:', data);
            
            // --- UPDATED LOGIC ---
            // Save both the token and the full user object to local storage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            
            // Redirect based on role
            if (data.role === 'helpdesk') {
                window.location.href = '/helpdesk-dashboard';
            } else {
                window.location.href = '/'; // Default redirect
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
        
        const payload = { ...registerData, role };

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to register');
            }
            console.log('Registration successful:', data);
            // TODO: Automatically log in or switch to login view
            setIsLoginView(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card">
                {/* Login Form */}
                <div className={`auth-form-container ${isLoginView ? 'active' : ''}`}>
                    <form onSubmit={handleLoginSubmit} className="auth-form">
                        <h2 className="form-title">Welcome Back</h2>
                        <p className="form-subtitle">Sign in to continue to MediCare+</p>
                        
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

                {/* Register Form */}
                <div className={`auth-form-container ${!isLoginView ? 'active' : ''}`}>
                    <form onSubmit={handleRegisterSubmit} className="auth-form">
                        <h2 className="form-title">Create Account</h2>
                        <p className="form-subtitle">Get started with your health journey</p>
                        
                        {error && !isLoginView && <p className="error-message">{error}</p>}

                        <div className="input-group">
                            <label htmlFor="reg-name">Full Name</label>
                            <input id="reg-name" name="name" type="text" required onChange={handleRegisterChange} value={registerData.name}/>
                        </div>
                        <div className="input-group">
                            <label htmlFor="reg-email">Email Address</label>
                            <input id="reg-email" name="email" type="email" required onChange={handleRegisterChange} value={registerData.email}/>
                        </div>
                        <div className="input-group">
                            <label htmlFor="reg-phone">Phone Number</label>
                            <input id="reg-phone" name="phone" type="tel" required onChange={handleRegisterChange} value={registerData.phone}/>
                        </div>
                        <div className="input-group">
                            <label htmlFor="reg-password">Password</label>
                            <input id="reg-password" name="password" type="password" required onChange={handleRegisterChange} value={registerData.password}/>
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
                                <input id="hospitalName" name="hospitalName" type="text" onChange={handleRegisterChange} value={registerData.hospitalName}/>
                            </div>
                        </div>
                        <div className={`conditional-field ${role === 'doctor' ? 'visible' : ''}`}>
                             <div className="input-group">
                                <label htmlFor="designation">Designation</label>
                                <input id="designation" name="designation" type="text" onChange={handleRegisterChange} value={registerData.designation}/>
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
