function sanitizeProperty(propertyObj, context = 'external') {
    const clone = JSON.parse(JSON.stringify(propertyObj)); // ✅ Fully deep clone

    const sensitiveFields = [
        'agentId',
        'createdBy',
        '__v',
        'deleted_at',
        'followUpTasks',
        'conversation',
        'currentStatus',
        'decisionStatus',
        'publicListing',
        'notes'
    ];

    if (context !== 'owner') {
        for (const field of sensitiveFields) {
            delete clone[field];
        }
    }

    // console.log(">>> clone after strip:", clone);
    return clone;
}

module.exports = sanitizeProperty;
