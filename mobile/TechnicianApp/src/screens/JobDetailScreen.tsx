import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Job, JobStatus} from '../types/Job';
import {apiService} from '../services/api';

interface Props {
  route: any;
  navigation: any;
}

interface JobPhoto {
  id: string;
  uri: string;
  timestamp: string;
  caption: string;
  type: 'before' | 'during' | 'after';
}

const JobDetailScreen: React.FC<Props> = ({route, navigation}) => {
  const {jobId} = route.params;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPhotoType, setCurrentPhotoType] = useState<'before' | 'during' | 'after'>('before');

  const loadJob = async () => {
    try {
      setLoading(true);
      const jobData = await apiService.getJobById(jobId);
      setJob(jobData);
      setNotes(jobData.notes || '');
    } catch (error) {
      Alert.alert('Error', 'Failed to load job details');
      console.error('Error loading job:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (newStatus: JobStatus) => {
    if (!job) return;

    try {
      const updatedJob = await apiService.updateJob(job.id, {
        status: newStatus,
        notes: notes,
        ...(newStatus === 'in_progress' && {time_started: new Date().toISOString()}),
        ...(newStatus === 'completed' && {time_completed: new Date().toISOString()}),
      });
      setJob(updatedJob);
      Alert.alert('Success', `Job marked as ${newStatus}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update job status');
      console.error('Error updating job:', error);
    }
  };

  const saveNotes = async () => {
    if (!job) return;

    try {
      const updatedJob = await apiService.updateJob(job.id, {notes});
      setJob(updatedJob);
      Alert.alert('Success', 'Notes saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save notes');
      console.error('Error saving notes:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
      });
      
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        uploadPhoto(asset.uri || '');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const selectPhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });
      
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        uploadPhoto(asset.uri || '');
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const uploadPhoto = async (uri: string) => {
    if (!job) return;
    
    try {
      setUploadingPhoto(true);
      
      // For the demo, we'll just add it locally
      // In a real app, this would upload to the server
      // await apiService.uploadJobPhoto(job.id, uri);
      
      const newPhoto: JobPhoto = {
        id: Date.now().toString(),
        uri: uri,
        timestamp: new Date().toISOString(),
        caption: '',
        type: currentPhotoType,
      };
      
      setPhotos(prev => [...prev, newPhoto]);
      Alert.alert('Success', 'Photo added successfully');
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const updatePhotoCaption = (id: string, caption: string) => {
    setPhotos(prev => 
      prev.map(photo => 
        photo.id === id ? {...photo, caption} : photo
      )
    );
  };

  const deletePhoto = (id: string) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPhotos(prev => prev.filter(photo => photo.id !== id));
          },
        },
      ]
    );
  };
  
  useEffect(() => {
    loadJob();
  }, [jobId]);

  if (!job) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#2196F3';
      case 'in_progress':
        return '#FF9800';
      case 'completed':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{job.title}</Text>
        <View style={[styles.statusBadge, {backgroundColor: getStatusColor(job.status)}]}>
          <Text style={styles.statusText}>{job.status}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        <Text style={styles.customerName}>{job.customer.name}</Text>
        <Text style={styles.customerInfo}>{job.customer.phone}</Text>
        <Text style={styles.customerInfo}>{job.customer.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.address}>{job.location.address}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        <Text style={styles.scheduleText}>
          {job.scheduled_date} | {job.scheduled_time_start} - {job.scheduled_time_end}
        </Text>
        <Text style={styles.duration}>
          Estimated Duration: {job.estimated_duration} minutes
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{job.description}</Text>
      </View>

      {job.requirements && job.requirements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requirements</Text>
          {job.requirements.map((req, index) => (
            <Text key={index} style={styles.requirement}>
              • {req}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes about this job..."
        />
        <TouchableOpacity style={styles.saveNotesButton} onPress={saveNotes}>
          <Text style={styles.saveNotesText}>Save Notes</Text>
        </TouchableOpacity>
      </View>
      
      {/* Photo Documentation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photo Documentation</Text>
        
        {/* Photo Type Selection */}
        <View style={styles.photoTypeSelector}>
          <TouchableOpacity 
            style={[styles.photoTypeButton, currentPhotoType === 'before' && styles.activePhotoType]}
            onPress={() => setCurrentPhotoType('before')}
          >
            <Text style={[styles.photoTypeText, currentPhotoType === 'before' && styles.activePhotoTypeText]}>Before</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.photoTypeButton, currentPhotoType === 'during' && styles.activePhotoType]}
            onPress={() => setCurrentPhotoType('during')}
          >
            <Text style={[styles.photoTypeText, currentPhotoType === 'during' && styles.activePhotoTypeText]}>During</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.photoTypeButton, currentPhotoType === 'after' && styles.activePhotoType]}
            onPress={() => setCurrentPhotoType('after')}
          >
            <Text style={[styles.photoTypeText, currentPhotoType === 'after' && styles.activePhotoTypeText]}>After</Text>
          </TouchableOpacity>
        </View>
        
        {/* Photo Actions */}
        <View style={styles.photoActions}>
          <TouchableOpacity 
            style={styles.photoActionButton}
            onPress={takePhoto}
            disabled={uploadingPhoto}
          >
            <Icon name="camera" size={24} color="#2196F3" />
            <Text style={styles.photoActionText}>Take Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.photoActionButton}
            onPress={selectPhoto}
            disabled={uploadingPhoto}
          >
            <Icon name="image" size={24} color="#4CAF50" />
            <Text style={styles.photoActionText}>Select Photo</Text>
          </TouchableOpacity>
        </View>
        
        {uploadingPhoto && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color="#2196F3" />
            <Text style={styles.uploadingText}>Uploading photo...</Text>
          </View>
        )}
        
        {/* Photo Gallery */}
        {photos.length > 0 ? (
          <FlatList
            data={photos}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.photoList}
            renderItem={({item}) => (
              <View style={styles.photoContainer}>
                <Image source={{uri: item.uri}} style={styles.photo} />
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoType}>{item.type}</Text>
                </View>
                <TextInput
                  style={styles.captionInput}
                  placeholder="Add caption..."
                  value={item.caption}
                  onChangeText={(text) => updatePhotoCaption(item.id, text)}
                />
                <TouchableOpacity 
                  style={styles.deletePhotoButton}
                  onPress={() => deletePhoto(item.id)}
                >
                  <Icon name="delete" size={20} color="#F44336" />
                </TouchableOpacity>
              </View>
            )}
          />
        ) : (
          <Text style={styles.noPhotosText}>No photos added yet.</Text>
        )}
      </View>

      <View style={styles.actions}>
        {job.status === 'scheduled' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.startButton]}
            onPress={() => updateJobStatus('in_progress')}>
            <Text style={styles.actionButtonText}>Start Job</Text>
          </TouchableOpacity>
        )}

        {job.status === 'in_progress' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => updateJobStatus('completed')}>
            <Text style={styles.actionButtonText}>Complete Job</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.mapButton]}
          onPress={() => {
            // Navigate to map with job location
            navigation.navigate('Map', {
              latitude: job.location.latitude,
              longitude: job.location.longitude,
            });
          }}>
          <Text style={styles.actionButtonText}>View on Map</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    margin: 8,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  customerInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  address: {
    fontSize: 16,
    color: '#333',
  },
  scheduleText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  duration: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  requirement: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  saveNotesButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  saveNotesText: {
    color: 'white',
    fontWeight: 'bold',
  },
  actions: {
    padding: 16,
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: '#FF9800',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  mapButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  photoTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activePhotoType: {
    backgroundColor: '#2196F3',
  },
  photoTypeText: {
    fontSize: 14,
    color: '#666',
  },
  activePhotoTypeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  photoActionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  uploadingText: {
    marginLeft: 8,
    color: '#666',
  },
  photoList: {
    paddingVertical: 8,
  },
  photoContainer: {
    width: 150,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  photo: {
    width: 150,
    height: 150,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  photoOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoType: {
    color: 'white',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  captionInput: {
    padding: 8,
    fontSize: 12,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPhotosText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 16,
  },
});

export default JobDetailScreen;