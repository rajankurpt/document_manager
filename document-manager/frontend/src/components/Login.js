import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const API_URL = process.env.REACT_APP_AUTH_API_URL || 'http://localhost:5005/api/auth';

const Login = ({ setUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/login`, { username, password });
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      navigate('/dashboard');
    } catch (error) {
      setMessage('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">📄</div>
        <h2 className="login-title">Document Manager</h2>
        <form onSubmit={handleLogin} className="login-form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="login-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
          />
          <button type="submit" className="login-btn">Login</button>
        </form>
        {message && <div className="login-alert">{message}</div>}
        <p className="login-link">
          Contact your administrator to create an account
        </p>
      </div>
    </div>
  );
};

export default Login;
