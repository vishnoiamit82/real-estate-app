function sanitizeProperty(propertyObj, context = 'external') {
    const clone = JSON.parse(JSON.stringify(propertyObj)); // ✅ Fully deep clone

    const sensitiveFields = [
        'agentId',
        'createdBy',
        '__v',
        'is_deleted',
        'deleted_at',
        'followUpTasks',
        'conversation',
        'currentStatus',
        'decisionStatus',
        'publicListing',
        'shareToken',
        'notes',
        'createdAt',
        'updatedAt',
    ];

    if (context !== 'owner') {
        for (const field of sensitiveFields) {
            delete clone[field];
        }
    }

    console.log(">>> clone after strip:", clone);
    return clone;
}

module.exports = sanitizeProperty;
