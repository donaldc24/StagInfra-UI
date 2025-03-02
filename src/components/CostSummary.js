import React from 'react';
import '../styles/CostSummary.css';

function CostSummary({ totalCost }) {
    return (
        <div className="cost-summary">
            <p>Total Cost:</p>
            <p className="cost-amount">${totalCost}/month</p>
        </div>
    );
}

export default CostSummary;