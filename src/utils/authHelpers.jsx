import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook for handling protected navigation
 * @returns {Object} - Navigation helper functions
 */
export function useProtectedNavigation() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  /**
   * Navigate to a route with authentication check
   * @param {string} targetPath - Path to navigate to if authenticated
   * @param {string} fallbackPath - Path to redirect to if not authenticated (default: '/login')
   */
  const navigateWithAuth = (targetPath, fallbackPath = '/login') => {
    if (isAuthenticated) {
      navigate(targetPath);
    } else {
      navigate(fallbackPath);
    }
  };

  /**
   * Handle button click with authentication requirement
   * @param {string} targetPath - Path to navigate to if authenticated
   * @param {Function} callback - Optional callback to execute if authenticated
   * @param {string} fallbackPath - Path to redirect to if not authenticated
   */
  const handleProtectedAction = (targetPath, callback, fallbackPath = '/login') => {
    if (isAuthenticated) {
      if (callback) callback();
      if (targetPath) navigate(targetPath);
    } else {
      navigate(fallbackPath);
    }
  };

  return {
    isAuthenticated,
    user,
    navigateWithAuth,
    handleProtectedAction,
  };
}

/**
 * Higher-order component for protecting routes
 * @param {React.Component} Component - Component to protect
 * @param {string} fallbackPath - Path to redirect to if not authenticated
 * @returns {React.Component} - Protected component
 */
export function withAuthProtection(Component, fallbackPath = '/login') {
  return function ProtectedComponent(props) {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    if (!isAuthenticated) {
      navigate(fallbackPath);
      return null;
    }

    return <Component {...props} />;
  };
}

/**
 * Check if a user has a specific subscription level
 * @param {Object} user - User object
 * @param {string|string[]} requiredPlans - Required plan names
 * @returns {boolean} - Whether user has required subscription
 */
export function hasSubscription(user, requiredPlans) {
  if (!user || !user.isSubscribed) return false;
  
  if (Array.isArray(requiredPlans)) {
    return requiredPlans.includes(user.planName);
  }
  
  return user.planName === requiredPlans;
}

/**
 * Check if a user can access premium features
 * @param {Object} user - User object
 * @returns {boolean} - Whether user can access premium features
 */
export function canAccessPremium(user) {
  return hasSubscription(user, ['Premium', 'Pro', 'Enterprise']);
}

/**
 * Get user display name with fallback
 * @param {Object} user - User object
 * @returns {string} - Display name
 */
export function getUserDisplayName(user) {
  if (!user) return 'Guest';
  return user.name || user.firstName || user.email || 'User';
}

/**
 * Get user initials for avatar
 * @param {Object} user - User object
 * @returns {string} - User initials
 */
export function getUserInitials(user) {
  if (!user) return 'G';

  const name = user.name || user.firstName || user.email || '';
  const parts = name.trim().split(/\s+/);
  
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  return name.slice(0, 2).toUpperCase();
}
/**
 * Button action types for consistent behavior
 */
export const BUTTON_ACTIONS = {
  // Public actions (no auth required)
  VIEW_PLANS: { requiresAuth: false, path: '/plans' },
  LEARN_MORE: { requiresAuth: false },
  VIEW_BLOG: { requiresAuth: false, path: '/blog' },
  VIEW_NUTRITIONISTS: { requiresAuth: false, path: '/nutritionists' },
  
  // Protected actions (auth required)
  BOOK_SESSION: { requiresAuth: true, path: '/user/consultation' },
  SUBSCRIBE: { requiresAuth: true, path: '/user/subscribe' },
  GO_TO_DASHBOARD: { requiresAuth: true, path: '/user/dashboard' },
  VIEW_PROFILE: { requiresAuth: true, path: '/user/profile' },
  TRACK_PROGRESS: { requiresAuth: true, path: '/user/tracker' },
  
  // Premium actions (subscription required)
  MEAL_PLAN: { requiresAuth: true, requiresSubscription: true, path: '/user/meal-plan' },
  MESSAGING: { requiresAuth: true, requiresSubscription: true, path: '/user/messages' },
};

/**
 * Handle button click based on action type
 * @param {string} actionType - Action type from BUTTON_ACTIONS
 * @param {Object} user - User object
 * @param {Function} navigate - Navigate function
 * @param {Function} callback - Optional callback
 */
export function handleButtonClick(actionType, user, navigate, callback) {
  const action = BUTTON_ACTIONS[actionType];
  if (!action) return;

  // Check if authentication is required
  if (action.requiresAuth && !user) {
    navigate('/login');
    return;
  }

  // Check if subscription is required
  if (action.requiresSubscription && !canAccessPremium(user)) {
    navigate('/user/subscribe');
    return;
  }

  // Execute callback if provided
  if (callback) callback();

  // Navigate to target path
  if (action.path) {
    navigate(action.path);
  }
}

