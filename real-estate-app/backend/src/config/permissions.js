// config/permissions.js

// Define permissions by role
const ROLE_PERMISSIONS = {
    admin: [
        'manage_users',
        'view_property',
        'share_property',
        'access_contacts',
        'access_admin_dashboard',
        'manage_subscriptions'
    ],
    buyers_agent: [
        'view_property',
        'share_property',
        'access_contacts'
    ],
    sales_agent: [
        'view_property',
        'manage_properties',
        'access_sales_dashboard'
    ],
    client: [
        'view_property'
    ],
    external_partner: [
        'view_property',
        'access_contacts'
    ],
    staff: [
        'view_property',
        'share_property'
    ]
};

// Define permissions by subscription tier
const SUBSCRIPTION_PERMISSIONS = {
    free: [
        'view_property',
        'share_property'
    ],
    medium: [
        'view_property',
        'share_property',
        'access_contacts'
    ],
    premium: [
        'view_property',
        'share_property',
        'access_contacts',
        'access_admin_dashboard',
        'manage_subscriptions'
    ]
};

// Utility function to get permissions for a user
const getPermissions = (role, subscriptionTier) => {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    const subscriptionPermissions = SUBSCRIPTION_PERMISSIONS[subscriptionTier] || [];
    
    // Combine both role and subscription-based permissions
    return Array.from(new Set([...rolePermissions, ...subscriptionPermissions]));
};

module.exports = {
    ROLE_PERMISSIONS,
    SUBSCRIPTION_PERMISSIONS,
    getPermissions
};
