import React from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';

// Google Maps configuration
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

interface MapProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  children?: React.ReactNode;
  onAddressSelect?: (address: string, coordinates: google.maps.LatLngLiteral) => void;
}

interface MarkerProps {
  position: google.maps.LatLngLiteral;
  map?: google.maps.Map;
}

// Map component
const Map: React.FC<MapProps> = ({ center, zoom, children, onAddressSelect }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [map, setMap] = React.useState<google.maps.Map>();

  React.useEffect(() => {
    if (ref.current && !map) {
      const newMap = new window.google.maps.Map(ref.current, {
        center,
        zoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Add click listener for address selection
      if (onAddressSelect) {
        const geocoder = new google.maps.Geocoder();
        
        newMap.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            geocoder.geocode(
              { location: event.latLng },
              (results, status) => {
                if (status === 'OK' && results && results[0]) {
                  const address = results[0].formatted_address;
                  const coordinates = {
                    lat: event.latLng!.lat(),
                    lng: event.latLng!.lng()
                  };
                  onAddressSelect(address, coordinates);
                }
              }
            );
          }
        });
      }

      setMap(newMap);
    }
  }, [ref, map, center, zoom, onAddressSelect]);

  return (
    <div ref={ref} style={{ width: '100%', height: '300px' }}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, { map });
        }
      })}
    </div>
  );
};

// Marker component
const Marker: React.FC<MarkerProps> = ({ position, map }) => {
  const [marker, setMarker] = React.useState<google.maps.Marker>();

  React.useEffect(() => {
    if (!marker && map) {
      setMarker(new google.maps.Marker({ position, map }));
    }

    return () => {
      if (marker) {
        marker.setMap(null);
      }
    };
  }, [marker, position, map]);

  React.useEffect(() => {
    if (marker) {
      marker.setPosition(position);
    }
  }, [marker, position]);

  return null;
};

// Render function for map loading states
const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading map...</div>;
    case Status.FAILURE:
      return <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Error loading map</div>;
    case Status.SUCCESS:
      return <div>Map loaded successfully</div>;
  }
};

// Address search function
export const searchAddress = async (address: string): Promise<google.maps.LatLngLiteral | null> => {
  if (!window.google) return null;
  
  const geocoder = new google.maps.Geocoder();
  
  return new Promise((resolve) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        resolve({
          lat: location.lat(),
          lng: location.lng()
        });
      } else {
        resolve(null);
      }
    });
  });
};

// Main Google Maps wrapper component
export const GoogleMapsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ccc' }}>
        Google Maps API key not configured
      </div>
    );
  }

  return (
    <Wrapper apiKey={GOOGLE_MAPS_API_KEY} render={render}>
      {children}
    </Wrapper>
  );
};

export { Map, Marker };