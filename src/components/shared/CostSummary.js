import React from 'react';
import '../../styles/components.css';

function CostSummary({ totalCost }) {
    return (
        <div className="cost-summary">
            <h3>Cost Estimate</h3>
            <p>Estimated monthly cost:</p>
            <p className="cost-amount">${typeof totalCost === 'number' ? totalCost.toFixed(2) : totalCost}/month</p>
            <div className="cost-info">
                <small>Based on on-demand pricing</small>
            </div>
        </div>
    );
}

export default CostSummary;