// utils/calculateMatchScore.js (Enhanced with unmatchedCriteria, matchedTags, matchTier)

const normalizePrice = (price) => {
    if (typeof price === 'string') {
        const match = price.match(/[\d,]+/);
        if (match) return parseFloat(match[0].replace(/,/g, ''));
    }
    if (typeof price === 'number') return price;
    return null;
};

const normalizeYield = (yieldStr) => {
    if (typeof yieldStr === 'string') {
        const match = yieldStr.match(/[\d.]+/);
        if (match) return parseFloat(match[0]);
    }
    if (typeof yieldStr === 'number') return yieldStr;
    return null;
};

const getWeight = (weights, key) => weights?.[key] || 1;


const calculateMatchScore = (property, clientBrief) => {
    let score = 0;
    let maxScore = 0;
    const scoreDetails = [];
    const penalties = [];
    const unmatchedCriteria = [];
    const matchedTags = [];
    const w = clientBrief.weightage || {};
    const warnings = [];

    const addScore = (reason, points, tag = null) => {
        score += points;
        scoreDetails.push({ reason, points });
        if (tag) matchedTags.push(tag);
    };

    const addPenalty = (reason, points) => {
        score -= points;
        penalties.push({ reason, points: -points });
    };

    const getTier = (s) => {
        if (s >= 90) return "✅ Perfect Match";
        if (s >= 75) return "👍 Good Match";
        if (s >= 50) return "⚠ Moderate Match";
        return "❌ Low Match";
    };

    const price = normalizePrice(property.askingPrice);
    const interestRate = clientBrief.interestRate || 6;
    const lvr = clientBrief.lvr || 80;
    const loanAmount = price * (lvr / 100);
    const monthlyInterest = (loanAmount * (interestRate / 100)) / 12;

    const insurance = parseFloat(normalizePrice(property.insurance)) || 0;
    const monthlyInsurance = insurance / 12;

    const councilRate = parseFloat(normalizePrice(property.councilRate)) || 0;
    const monthlyCouncil = councilRate / 12;

    const rent = normalizePrice(property.rental);
    const monthlyRent = rent || 0;
    const propertyMgmtCost = monthlyRent * 0.07;

    const landTax = parseFloat(normalizePrice(property.landTax)) || 0;
    const monthlyLandTax = landTax / 12;
    holdingCostBreakdown={}

    // Try to use actual rental amount first
    let rentalAmount = 0;

    // Check if rental is a weekly amount like '$550 per week'
    if (typeof property.rental === 'string') {
    const extractedRental = normalizePrice(property.rental)
    rentalAmount = extractedRental * 4.33; // Convert weekly to monthly
    } else if (typeof property.rental === 'number') {
    rentalAmount = property.rental * 4.33;
    }

    // Add to breakdown
    holdingCostBreakdown.monthlyRentalIncome = rentalAmount.toFixed(2);
    


    const estimatedHoldingCost = monthlyInterest + monthlyInsurance + monthlyCouncil + propertyMgmtCost + monthlyLandTax;

    holdingCostBreakdown.loanAmount = loanAmount.toFixed(2);
    holdingCostBreakdown.monthlyInterest = monthlyInterest.toFixed(2);
    holdingCostBreakdown.monthlyInsurance = monthlyInsurance.toFixed(2);
    holdingCostBreakdown.monthlyCouncil = monthlyCouncil.toFixed(2);
    holdingCostBreakdown.propertyMgmtCost = propertyMgmtCost.toFixed(2);
    holdingCostBreakdown.monthlyLandTax = monthlyLandTax.toFixed(2);
    totalMonthlyHoldingCost = estimatedHoldingCost.toFixed(2);
    netMonthlyHoldingCost = (totalMonthlyHoldingCost - rentalAmount)


    // Budget
    const numericPrice = normalizePrice(property.askingPrice);
    const budgetWeight = getWeight(w, 'budget');
    maxScore += 10 * budgetWeight;
    if (numericPrice && clientBrief.budget?.max) {
        if (numericPrice <= clientBrief.budget.max) {
            addScore(`✅ Price within budget (<= $${clientBrief.budget.max})`, 10 * budgetWeight, '✅ Budget Match');
        } else {
            const diffRatio = clientBrief.budget.max / numericPrice;
            const partialPoints = Math.max(0, Math.round(10 * diffRatio) * budgetWeight);
            addScore(`⚠ Price exceeds budget, partial match`, partialPoints);
            unmatchedCriteria.push({ field: 'budget', message: `Price exceeds max budget ($${clientBrief.budget.max})` });
        }
    }

    // Location
    const locationWeight = getWeight(w, 'location');
    maxScore += 15 * locationWeight;
    if (Array.isArray(clientBrief.preferredLocations) && property.address) {
        const matches = clientBrief.preferredLocations.filter(loc => property.address.toLowerCase().includes(loc.toLowerCase()));
        if (matches.length > 0) {
            const partialPoints = Math.round((matches.length / clientBrief.preferredLocations.length) * 15 * locationWeight);
            addScore(`📍 Location matched (${matches.join(', ')})`, partialPoints, '📍 Location Match');
        } else {
            unmatchedCriteria.push({ field: 'location', message: 'Address does not match any preferred locations' });
        }
    }

    // Bedrooms
    const bedWeight = getWeight(w, 'bedrooms');
    maxScore += 10 * bedWeight;
    if (clientBrief.bedrooms && property.bedrooms) {
        const ratio = Math.min(1, property.bedrooms / clientBrief.bedrooms);
        const points = Math.round(10 * ratio * bedWeight);
        addScore(`🛏 Bedrooms match ratio: ${ratio}`, points, '🛏 Bedrooms Match');
        if (ratio < 1) unmatchedCriteria.push({ field: 'bedrooms', message: `Only ${property.bedrooms}, brief expects ${clientBrief.bedrooms}` });
    }

    // Bathrooms
    const bathWeight = getWeight(w, 'bathrooms');
    maxScore += 10 * bathWeight;
    if (clientBrief.bathrooms && property.bathrooms) {
        const ratio = Math.min(1, property.bathrooms / clientBrief.bathrooms);
        const points = Math.round(10 * ratio * bathWeight);
        addScore(`🛁 Bathrooms match ratio: ${ratio}`, points, '🛁 Bathrooms Match');
        if (ratio < 1) unmatchedCriteria.push({ field: 'bathrooms', message: `Only ${property.bathrooms}, brief expects ${clientBrief.bathrooms}` });
    }

    // Yield
    const yieldWeight = getWeight(w, 'minYield');
    maxScore += 10 * yieldWeight;
    const propertyYield = normalizeYield(property.rentalYield);
    if (clientBrief.minYield && propertyYield) {
        if (propertyYield >= clientBrief.minYield) {
            addScore(`💸 Yield matched (>= ${clientBrief.minYield}%)`, 10 * yieldWeight, '💸 Yield Match');
        } else {
            const ratio = propertyYield / clientBrief.minYield;
            const points = Math.round(10 * ratio * yieldWeight);
            addScore(`⚠ Yield below target`, points);
            unmatchedCriteria.push({ field: 'minYield', message: `Yield ${propertyYield}% is below required ${clientBrief.minYield}%` });
        }
    }


    // Build Year
    const ageWeight = getWeight(w, 'ageOfProperty');
    maxScore += 10 * ageWeight;
    if (clientBrief.minBuildYear && property.yearBuilt && !isNaN(parseInt(property.yearBuilt))) {
        const yearBuilt = parseInt(property.yearBuilt);
        if (yearBuilt >= clientBrief.minBuildYear) {
            addScore(`🏗 Build year matched (>= ${clientBrief.minBuildYear})`, 10 * ageWeight, '🏗 Build Year Match');
        } else {
            const diffRatio = yearBuilt / clientBrief.minBuildYear;
            addScore(`⚠ Build year below target`, Math.round(10 * diffRatio * ageWeight));
            unmatchedCriteria.push({ field: 'ageOfProperty', message: `Build year ${yearBuilt} < required ${clientBrief.minBuildYear}` });
        }
    }

    // Subdivision potential
    const subdivWeight = getWeight(w, 'subdivisionPotential');
    maxScore += 5 * subdivWeight;
    if (property.subdivisionPotential) {
        addScore(`🏘 Subdivision potential matched`, 5 * subdivWeight, '🏘 Subdivision Match');
    } else {
        unmatchedCriteria.push({ field: 'subdivisionPotential', message: 'No subdivision potential' });
    }

    // Holding Cost Scoring
    const holdWeight = getWeight(w, 'maxMonthlyHoldingCost');
    maxScore += 10 * holdWeight;


    if (price && interestRate && lvr && monthlyInsurance && monthlyCouncil) {
        if (clientBrief.maxMonthlyHoldingCost) {
            if (netMonthlyHoldingCost <= clientBrief.maxMonthlyHoldingCost) {
                addScore(`💵 Holding cost matched (est. $${netMonthlyHoldingCost.toFixed(2)} / mo)`, 10 * holdWeight, '💵 Holding Cost Match');
            } else {
                const ratio = clientBrief.maxMonthlyHoldingCost / netMonthlyHoldingCost;
                addScore(`⚠ Holding cost exceeded (est. $${netMonthlyHoldingCost.toFixed(2)} / mo)`, Math.round(10 * ratio * holdWeight));
                unmatchedCriteria.push({
                    field: 'maxMonthlyHoldingCost',
                    message: `Estimated holding cost $${netMonthlyHoldingCost.toFixed(2)} exceeds brief max $${clientBrief.maxMonthlyHoldingCost}`
                });
            }
        }
    } else {
        warnings.push('⚠ Holding cost could not be calculated due to missing inputs (price, LVR, interest rate, council rate or insurance). This criterion is excluded from the match score.');
    }


    const finalScore = Math.min(100, Math.round((score / maxScore) * 100));
    const matchTier = getTier(finalScore);

    return { score: finalScore, scoreDetails, maxScore, rawScore: score, penalties, unmatchedCriteria, matchedTags, matchTier, estimatedHoldingCost: estimatedHoldingCost,netMonthlyHoldingCost: netMonthlyHoldingCost,holdingCostBreakdown,warnings, calculationInputs: {
        interestRateUsed: interestRate,
        lvrUsed: lvr,
        purchasePriceUsed: price
      }};
};

module.exports = { calculateMatchScore };
