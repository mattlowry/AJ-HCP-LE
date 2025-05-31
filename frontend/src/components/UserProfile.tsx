import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Grid,
  Avatar,
  Card,
  CardContent,
  Divider,
  Chip,
  CircularProgress,
  InputAdornment,
  IconButton,
  Tab,
  Tabs
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Security as SecurityIcon,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { validateForm, validationPatterns } from '../utils/validation';

interface ProfileData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  companyName?: string;
  bio?: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    companyName: '',
    bio: ''
  });
  const [originalData, setOriginalData] = useState<ProfileData>({} as ProfileData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Password change state
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    if (user) {
      const initialData = {
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: '',
        companyName: '',
        bio: ''
      };
      setProfileData(initialData);
      setOriginalData(initialData);
    }
  }, [user]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    setSuccessMessage('');
  };

  const handleInputChange = (field: keyof ProfileData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setProfileData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePasswordInputChange = (field: keyof PasswordChangeData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    
    if (passwordErrors[field]) {
      setPasswordErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateProfileForm = () => {
    const validationRules = {
      email: { required: true, pattern: validationPatterns.email },
      firstName: { required: true, minLength: 2 },
      lastName: { required: true, minLength: 2 },
      username: { required: true, minLength: 3 }
    };
    
    const result = validateForm(profileData, validationRules);
    setFormErrors(result.errors);
    return result.isValid;
  };

  const validatePasswordForm = () => {
    const validationRules = {
      currentPassword: { required: true, minLength: 6 },
      newPassword: { required: true, minLength: 8 },
      confirmPassword: { required: true, minLength: 8 }
    };
    
    const result = validateForm(passwordData, validationRules);
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      result.errors.confirmPassword = 'Passwords do not match';
      result.isValid = false;
    }
    
    if (passwordData.currentPassword === passwordData.newPassword) {
      result.errors.newPassword = 'New password must be different from current password';
      result.isValid = false;
    }
    
    setPasswordErrors(result.errors);
    return result.isValid;
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setProfileData(originalData);
      setFormErrors({});
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = async () => {
    if (!validateProfileForm()) {
      return;
    }

    setSaving(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Profile updated:', profileData);
      setOriginalData(profileData);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Profile update error:', error);
      setFormErrors({ general: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    setSaving(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Password changed');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setSuccessMessage('Password changed successfully!');
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Password change error:', error);
      setPasswordErrors({ general: 'Failed to change password. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'primary';
      case 'technician': return 'success';
      case 'customer': return 'warning';
      default: return 'default';
    }
  };

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const ProfileTab = () => (
    <Box>
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {formErrors.general && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {formErrors.general}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar 
              sx={{ 
                width: 80, 
                height: 80, 
                mr: 3, 
                bgcolor: 'primary.main',
                fontSize: '2rem'
              }}
            >
              {user.first_name[0]}{user.last_name[0]}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" fontWeight="bold">
                {user.first_name} {user.last_name}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                @{user.username}
              </Typography>
              <Chip 
                label={user.role} 
                color={getRoleColor(user.role) as any}
                sx={{ textTransform: 'capitalize' }}
              />
            </Box>
            <Button
              variant={isEditing ? "outlined" : "contained"}
              startIcon={isEditing ? <CancelIcon /> : <EditIcon />}
              onClick={handleEditToggle}
              disabled={saving}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Profile Information
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="First Name"
              value={profileData.firstName}
              onChange={handleInputChange('firstName')}
              disabled={!isEditing}
              error={!!formErrors.firstName}
              helperText={formErrors.firstName}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={profileData.lastName}
              onChange={handleInputChange('lastName')}
              disabled={!isEditing}
              error={!!formErrors.lastName}
              helperText={formErrors.lastName}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Username"
              value={profileData.username}
              onChange={handleInputChange('username')}
              disabled={!isEditing}
              error={!!formErrors.username}
              helperText={formErrors.username}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              value={profileData.email}
              onChange={handleInputChange('email')}
              disabled={!isEditing}
              error={!!formErrors.email}
              helperText={formErrors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone Number"
              value={profileData.phone}
              onChange={handleInputChange('phone')}
              disabled={!isEditing}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Company Name"
              value={profileData.companyName}
              onChange={handleInputChange('companyName')}
              disabled={!isEditing}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BusinessIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Bio"
              value={profileData.bio}
              onChange={handleInputChange('bio')}
              disabled={!isEditing}
              multiline
              rows={3}
              placeholder="Tell us about yourself..."
            />
          </Grid>
        </Grid>

        {isEditing && (
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={handleEditToggle}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );

  const SecurityTab = () => (
    <Box>
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {passwordErrors.general && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {passwordErrors.general}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Change Password
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Current Password"
              type={showPasswords.current ? 'text' : 'password'}
              value={passwordData.currentPassword}
              onChange={handlePasswordInputChange('currentPassword')}
              error={!!passwordErrors.currentPassword}
              helperText={passwordErrors.currentPassword}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SecurityIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      edge="end"
                    >
                      {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="New Password"
              type={showPasswords.new ? 'text' : 'password'}
              value={passwordData.newPassword}
              onChange={handlePasswordInputChange('newPassword')}
              error={!!passwordErrors.newPassword}
              helperText={passwordErrors.newPassword || 'Minimum 8 characters'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SecurityIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      edge="end"
                    >
                      {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Confirm New Password"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwordData.confirmPassword}
              onChange={handlePasswordInputChange('confirmPassword')}
              error={!!passwordErrors.confirmPassword}
              helperText={passwordErrors.confirmPassword}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SecurityIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      edge="end"
                    >
                      {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} /> : <SecurityIcon />}
            onClick={handlePasswordChange}
            disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
          >
            {saving ? 'Changing...' : 'Change Password'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        User Profile
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Profile Information" />
          <Tab label="Security" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {currentTab === 0 && <ProfileTab />}
        {currentTab === 1 && <SecurityTab />}
      </Box>
    </Box>
  );
};

export default UserProfile;