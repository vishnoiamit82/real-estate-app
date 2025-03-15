const sanitizeProperty = require('../utils/sanitizeProperty');

function sanitizeResponseMiddleware(req, res, next) {
    console.log('📦 Middleware Loaded | Route:', req.originalUrl);

    const originalJson = res.json;

    res.json = function (data) {
        const userId = req.user?._id?.toString();
        console.log('👤 Logged-in userId:', userId || 'None (Public Access)');

        const sanitize = (obj) => {
            if (Array.isArray(obj)) {
                console.log(`🗂 Sanitizing array of ${obj.length} items`);
                return obj.map(item => maybeSanitize(item, userId));
            } else if (typeof obj === 'object' && obj !== null) {
                console.log('📄 Sanitizing single object');
                return maybeSanitize(obj, userId);
            }

            console.log('⚠️ Not sanitizing non-object/array response');
            return obj;
        };

        const maybeSanitize = (item, userId) => {
            if (!item || typeof item !== 'object') {
                console.log('❌ Skipping non-object item');
                return item;
            }

            const isPropertyObject = item.hasOwnProperty('address') && item.hasOwnProperty('propertyType');

            console.log('🔍 Item detected:', {
                id: item._id,
                hasAddress: item.hasOwnProperty('address'),
                hasPropertyType: item.hasOwnProperty('propertyType'),
                hasCreatedBy: item.hasOwnProperty('createdBy'),
                createdBy: item.createdBy,
            });

            if (isPropertyObject) {
                let context = 'external';

                const createdById =
                    typeof item.createdBy === 'object'
                        ? item.createdBy?._id?.toString()
                        : item.createdBy?.toString();

                console.log('👤 Detected createdById:', createdById);

                if (userId && createdById && createdById === userId) {
                    context = 'owner';
                }

                console.log('🔒 Sanitizing property with context:', context);
                const sanitized = sanitizeProperty(item, context);
                console.log('✅ Sanitized Property:', sanitized);
                return sanitized;
            }

            console.log('⛔ Not a property object — skipping sanitization');
            return item;
        };

        return originalJson.call(this, sanitize(data));
    };

    next();
}

module.exports = sanitizeResponseMiddleware;
