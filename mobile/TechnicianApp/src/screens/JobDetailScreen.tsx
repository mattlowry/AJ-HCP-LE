import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import {Job, JobStatus} from '../types/Job';
import {apiService} from '../services/api';

interface Props {
  route: any;
  navigation: any;
}

const JobDetailScreen: React.FC<Props> = ({route, navigation}) => {
  const {jobId} = route.params;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');

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
});

export default JobDetailScreen;