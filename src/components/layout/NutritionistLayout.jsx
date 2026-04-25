import React from 'react';
import './NutritionistLayout.css'; // Assuming you have CSS file for styles

const NutritionistLayout = () => {
    return (
        <div className="nutritionist-layout">
            <header className="header">
                <h1>Nutritionist Dashboard</h1>
            </header>
            <nav className="sidebar">
                <ul>
                    <li>Home</li>
                    <li>Clients</li>
                    <li>Plans</li>
                    <li>Reports</li>
                    <li>Settings</li>
                </ul>
            </nav>
            <main className="main-content">
                {/* Add your main content here */}
            </main>
        </div>
    );
};

export default NutritionistLayout;
