import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
    return (
        <div className="admin-layout">
            <Sidebar />
            <div className="main-content">
                <Header />
                <div className="hero-card">
                    <h1>Welcome to Admin Dashboard</h1>
                </div>
                <div className="children-content">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;