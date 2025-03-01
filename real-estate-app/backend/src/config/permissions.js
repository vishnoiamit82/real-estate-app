// config/permissions.js

// Define permissions by role


// config/permissions.js

// ✅ Permission Groups (Organized by Functionality)
const PERMISSION_GROUPS = {
    property_management: ['view_property', 'share_property', 'update_property', 'delete_property', 'restore_property'],
    communications: ['send_sms', 'send_email', 'email_management'],
    agent_access: ['view_agents'],
    notes_and_conversations: ['view_conversations', 'view_notes', 'create_notes', 'get_notes'],
    user_management: ['manage_users', 'view_users'],
    subscriptions: ['manage_subscriptions'],
    contacts: ['access_contacts'],
    admin_dashboard: ['access_admin_dashboard'],
    sales_dashboard: ['access_sales_dashboard']
};


// ✅ Define Role-Based Permissions Using Groups
const ROLE_PERMISSIONS = {
    admin: [
        ...PERMISSION_GROUPS.user_management,
        ...PERMISSION_GROUPS.property_management,
        ...PERMISSION_GROUPS.communications,
        ...PERMISSION_GROUPS.contacts,
        ...PERMISSION_GROUPS.admin_dashboard,
        ...PERMISSION_GROUPS.agent_access,
        ...PERMISSION_GROUPS.subscriptions
    ],
    buyers_agent: [
        ...PERMISSION_GROUPS.property_management,
        ...PERMISSION_GROUPS.contacts
    ],
    sales_agent: [
        ...PERMISSION_GROUPS.property_management,
        ...PERMISSION_GROUPS.sales_dashboard
    ],
    client: [
        'view_property'
    ],
    external_partner: [
        'view_property',
        ...PERMISSION_GROUPS.contacts
    ],
    staff: [
        'view_property',
        'share_property'
    ],
    property_sourcer: [
        ...PERMISSION_GROUPS.property_management,
        ...PERMISSION_GROUPS.communications,
        ...PERMISSION_GROUPS.agent_access,
        ...PERMISSION_GROUPS.notes_and_conversations
    ]
};


// const ROLE_PERMISSIONS = {
//     admin: [
//         'manage_users',
//         'view_users',
//         'view_property',
//         'share_property',
//         'access_contacts',
//         'access_admin_dashboard',
//         'manage_subscriptions',
//         'view_agents'
//     ],
//     buyers_agent: [
//         'view_property',
//         'share_property',
//         'access_contacts'
//     ],
//     sales_agent: [
//         'view_property',
//         'manage_properties',
//         'access_sales_dashboard'
//     ],
//     client: [
//         'view_property'
//     ],
//     external_partner: [
//         'view_property',
//         'access_contacts'
//     ],
//     staff: [
//         'view_property',
//         'share_property'
//     ],
//     property_sourcer:[
//         'view_property',
//         'share_property',
//         'update_property',
//         'delete_property',
//         'restore_property',
//         'send_sms',
//         'send_email',
//         'email_management',
//         'view_agents',
//         'share_property',
//         'view_conversations',
//         'view_notes',
//         'create_notes',
//         'get_notes',
//     ]
// };


// ✅ Define Subscription-Based Enhancements
const SUBSCRIPTION_PERMISSIONS = {
    free: [
        'view_property',
        'share_property'
    ]
};

// Now that free is initialized, we can reference it inside medium & premium
SUBSCRIPTION_PERMISSIONS.medium = [
    ...SUBSCRIPTION_PERMISSIONS.free,
    ...PERMISSION_GROUPS.contacts
];

SUBSCRIPTION_PERMISSIONS.premium = [
    ...SUBSCRIPTION_PERMISSIONS.medium,
    ...PERMISSION_GROUPS.admin_dashboard,
    ...PERMISSION_GROUPS.subscriptions
];


// Utility function to get permissions for a user
const getPermissions = (role, subscriptionTier) => {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    const subscriptionPermissions = SUBSCRIPTION_PERMISSIONS[subscriptionTier] || [];
    
    // Combine both role and subscription-based permissions
    return Array.from(new Set([...rolePermissions, ...subscriptionPermissions]));
};

module.exports = {
    PERMISSION_GROUPS,
    ROLE_PERMISSIONS,
    SUBSCRIPTION_PERMISSIONS,
    getPermissions
};
