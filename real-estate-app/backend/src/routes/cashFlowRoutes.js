const express = require('express');
const Property = require('../models/Property');
const ClientBrief = require('../models/ClientBriefs');

const router = express.Router();

// Calculate cash flow for a given property and client
router.post('/calculate', async (req, res) => {
    try {
        const {
            propertyId, 
            clientId, 
            purchasePrice, 
            loanAmount, 
            lvrPercentage, 
            councilRate, 
            maintenance, 
            insurance, 
            propertyManagementFee, 
            rentalIncome,
            loanTerm // Added loan term to calculate P+I
        } = req.body; 

        // Convert all values to integers to avoid NaN issues
        const parsedPurchasePrice = parseInt(purchasePrice) || 0;
        const parsedLoanAmount = parseInt(loanAmount) || 0;
        const parsedLvrPercentage = parseInt(lvrPercentage) || 80;
        const parsedCouncilRate = parseInt(councilRate) || 2500;
        const parsedMaintenance = parseInt(maintenance) || 1500;
        const parsedInsurance = parseInt(insurance) || 2000;
        const parsedPropertyManagementFee = parseInt(propertyManagementFee) || 8;
        const parsedRentalIncome = parseInt(rentalIncome) || 0;
        const parsedLoanTerm = parseInt(loanTerm) || 30; // Default loan term to 30 years

        // Fetch client brief for interest rate
        const client = await ClientBrief.findById(clientId);
        if (!client) return res.status(404).json({ message: 'Client not found' });

        // Get client interest rate
        const interestRate = parseFloat(client.interestRate) / 100 || 0; // Convert to decimal

        // Calculate mortgage interest only payment
        const annualMortgageInterestOnly = Math.round(parsedLoanAmount * interestRate);

        // Calculate Principal + Interest (P+I) Loan Payment
        const monthlyRate = interestRate / 12; // Monthly interest rate
        const totalPayments = parsedLoanTerm * 12; // Total number of payments
        const monthlyPI = parsedLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1);
        const annualPI = Math.round(monthlyPI * 12);

        // Convert property management fee (percentage of rental income)
        const annualPropertyManagementFee = Math.round((parsedRentalIncome * 52) * (parsedPropertyManagementFee / 100));

        // Total expenses excluding mortgage
        const totalExpensesExcludingMortgage = parsedInsurance + parsedCouncilRate + parsedMaintenance + annualPropertyManagementFee;

        // Total expenses for both loan types
        const totalExpensesInterestOnly = totalExpensesExcludingMortgage + annualMortgageInterestOnly;
        const totalExpensesPI = totalExpensesExcludingMortgage + annualPI;

        // Calculate net cash flow for both loan types
        const annualCashFlowInterestOnly = Math.round((parsedRentalIncome * 52) - totalExpensesInterestOnly);
        const annualCashFlowPI = Math.round((parsedRentalIncome * 52) - totalExpensesPI);
        const monthlyCashFlowInterestOnly = Math.round(annualCashFlowInterestOnly / 12);
        const monthlyCashFlowPI = Math.round(annualCashFlowPI / 12);

        // Calculate Gross Yield
        const grossYield = parsedPurchasePrice > 0 ? ((parsedRentalIncome * 52) / parsedPurchasePrice) * 100 : 0;

        // Calculate Net Yield excluding mortgage payments
        const netYield = parsedPurchasePrice > 0 ? ((parsedRentalIncome * 52 - totalExpensesExcludingMortgage) / parsedPurchasePrice) * 100 : 0;

        res.status(200).json({
            rentalIncome: parsedRentalIncome * 52,
            mortgageInterestOnly: annualMortgageInterestOnly,
            mortgagePI: annualPI,
            insurance: parsedInsurance,
            councilRates: parsedCouncilRate,
            maintenance: parsedMaintenance,
            propertyManagementFee: annualPropertyManagementFee,
            totalExpensesInterestOnly,
            totalExpensesPI,
            monthlyCashFlowInterestOnly,
            annualCashFlowInterestOnly,
            monthlyCashFlowPI,
            annualCashFlowPI,
            grossYield: grossYield.toFixed(2),
            netYield: netYield.toFixed(2)
        });
    } catch (error) {
        console.error('Error calculating cash flow:', error);
        res.status(500).json({ message: 'Error calculating cash flow' });
    }
});

module.exports = router;
