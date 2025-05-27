import React, {useState, useEffect} from 'react';
import {View, StyleSheet, Alert, Text} from 'react-native';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {Job} from '../types/Job';
import {apiService} from '../services/api';

interface Props {
  route?: any;
}

const MapScreen: React.FC<Props> = ({route}) => {
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    checkLocationPermission();
    loadJobs();

    // If navigating from job detail with specific location
    if (route?.params?.latitude && route?.params?.longitude) {
      setRegion({
        latitude: route.params.latitude,
        longitude: route.params.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [route]);

  const checkLocationPermission = async () => {
    try {
      const result = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      
      if (result === RESULTS.GRANTED) {
        getCurrentLocation();
      } else {
        const requestResult = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
        if (requestResult === RESULTS.GRANTED) {
          getCurrentLocation();
        }
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const {latitude, longitude} = position.coords;
        setCurrentLocation({latitude, longitude});
        
        // Update region to current location if no specific location was passed
        if (!route?.params?.latitude) {
          setRegion({
            latitude,
            longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
        }

        // Send location to backend
        apiService.updateTechnicianLocation(latitude, longitude);
      },
      (error) => {
        console.error('Location error:', error);
        Alert.alert('Location Error', 'Unable to get current location');
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000}
    );
  };

  const loadJobs = async () => {
    try {
      const jobData = await apiService.getJobs();
      setJobs(jobData.filter(job => job.location && job.location.latitude && job.location.longitude));
    } catch (error) {
      console.error('Error loading jobs for map:', error);
    }
  };

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#2196F3';
      case 'in_progress':
        return '#FF9800';
      case 'completed':
        return '#4CAF50';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onRegionChangeComplete={setRegion}>
        
        {/* Current location marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="My Location"
            pinColor="blue"
          />
        )}

        {/* Job markers */}
        {jobs.map((job) => (
          <Marker
            key={job.id}
            coordinate={{
              latitude: job.location.latitude,
              longitude: job.location.longitude,
            }}
            title={job.title}
            description={`${job.customer.name} - ${job.status}`}
            pinColor={getMarkerColor(job.status)}
          />
        ))}
      </MapView>

      {/* Job count overlay */}
      <View style={styles.jobCountOverlay}>
        <Text style={styles.jobCountText}>
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} on map
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  jobCountOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 8,
  },
  jobCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default MapScreen;