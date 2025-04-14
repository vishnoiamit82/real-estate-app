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
        return obj.map((item) => maybeSanitize(item, userId));
      } else if (typeof obj === 'object' && obj !== null) {
        console.log('📄 Sanitizing object with potential nested values');
        const clone = typeof obj.toObject === 'function' ? obj.toObject() : { ...obj };


        for (const key in clone) {
          if (Array.isArray(clone[key])) {
            // console.log(`🔁 Recursively sanitizing array at key: ${key}`);
            clone[key] = clone[key].map((item) => maybeSanitize(item, userId));
          } else if (typeof clone[key] === 'object' && clone[key] !== null) {
            clone[key] = maybeSanitize(clone[key], userId);
          }
        }

        return maybeSanitize(clone, userId);
      }

      console.log('⚠️ Not sanitizing non-object/array response');
      return obj;
    };

    const maybeSanitize = (item, userId) => {
      if (!item || typeof item !== 'object') {
        console.log('❌ Skipping non-object item');
        return item;
      }

      const isPropertyObject =
        item.hasOwnProperty('address') &&
        item.hasOwnProperty('propertyType');

      if (isPropertyObject) {
        let context = 'external';
        let isOwner = false;

        const createdById =
          typeof item.createdBy === 'object'
            ? item.createdBy?._id?.toString()
            : item.createdBy?.toString();

        if (userId && createdById && createdById === userId) {
          context = 'owner';
          isOwner = true;
        }

        const sanitized = sanitizeProperty(item, context);
        return {
          ...sanitized,
          isOwner, // ✅ Inject ownership flag
        };
      }

      console.log('⛔ Not a property object — skipping sanitization');
      return item;
    };


    return originalJson.call(this, sanitize(data));
  };

  next();
}

module.exports = sanitizeResponseMiddleware;
