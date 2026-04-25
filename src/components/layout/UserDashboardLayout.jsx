import React from 'react';
import './UserDashboardLayout.css';

const UserDashboardLayout = () => {
    return (
        <div className="dashboard-container">
            <header className="header">
                <h1>User Dashboard</h1>
            </header>
            <div className="main-content">
                <aside className="sidebar">
                    <nav>
                        <ul>
                            <li>Tracker</li>
                            <li>Profile</li>
                            <li>Messages</li>
                            <li>Meal Plan</li>
                            <li>Consultation</li>
                            <li>Subscribe</li>
                            <li>Progress</li>
                            <li>Testimonial</li>
                        </ul>
                    </nav>
                </aside>
                <main className="content">
                    {/* Add main content here */}
                </main>
            </div>
        </div>
    );
};

export default UserDashboardLayout;