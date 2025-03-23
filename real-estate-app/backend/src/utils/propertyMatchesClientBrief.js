function propertyMatchesClientBrief(property, brief) {
    let score = 0;
    let totalCriteria = 0;

    // Budget (Max budget gives partial match opportunity)
    if (brief.budget?.max) {
        totalCriteria++;
        if (property.askingPrice <= brief.budget.max) score += 1;
    }

    // Rental Yield
    if (brief.rentalYield?.min) {
        totalCriteria++;
        if (property.rentalYield >= brief.rentalYield.min) score += 1;
    }

    // Land Size
    if (brief.landSize?.min) {
        totalCriteria++;
        if (property.landSize >= brief.landSize.min) score += 1;
    }

    // Property Type
    if (brief.propertyType) {
        totalCriteria++;
        if (brief.propertyType === property.propertyType) score += 1;
    }

    // Location (partial match)
    if (brief.preferredLocations?.length > 0) {
        totalCriteria++;
        const matchesLocation = brief.preferredLocations.some(loc =>
            property.address?.toLowerCase()?.includes(loc.toLowerCase())
        );
        if (matchesLocation) score += 1;
    }

    // Bedrooms
    if (brief.bedrooms) {
        totalCriteria++;
        if (property.bedrooms >= brief.bedrooms) score += 1;
    }

    // Bathrooms
    if (brief.bathrooms) {
        totalCriteria++;
        if (property.bathrooms >= brief.bathrooms) score += 1;
    }

    // Off-market preference
    if (brief.isOffmarketPreferred !== undefined) {
        totalCriteria++;
        if (brief.isOffmarketPreferred === property.isOffmarket) score += 1;
    }

    // Score as percentage
    const matchScore = totalCriteria > 0 ? Math.round((score / totalCriteria) * 100) : 0;

    return {
        isMatch: matchScore > 50, // Threshold to consider it a match, you can tune this
        matchScore,
        matchedCriteria: score,
        totalCriteria
    };
}

module.exports = propertyMatchesClientBrief;
