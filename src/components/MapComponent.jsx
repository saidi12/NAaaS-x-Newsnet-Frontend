import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import PAK_adm3 from '../assets/merge.json';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultMarker = new L.Icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

function capitalizeFirstLetterOnly(str) {
    if (!str || str.length === 0) return '';
    return str.charAt(0).toLowerCase() + str.slice(1).toLowerCase();
}

const MapComponent = () => {
    const news = useSelector(state => state.map.news);
    useEffect(() => {
       console.log(news)
    }, [news]);
    const regionSelected = useSelector(state => state.map.regionSelected);
    const [selectedRegions, setSelectedRegions] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const mapRef = useRef(null);

    const validFeatures = PAK_adm3.features.filter((feature) => {
        const coordinates = feature.geometry.coordinates;
        return coordinates && coordinates.length > 0 && coordinates[0].length > 0 && coordinates[0][0].length === 2;
    });
 
    const getRandomColor = () => {
        return '#' + Math.floor(Math.random() * 16777215).toString(16);
    };

    const handleSubSubRegionSelect = (selectedName) => {
        selectedName = capitalizeFirstLetterOnly(selectedName);
        const selectedFeature = validFeatures.find(
            (feature) => capitalizeFirstLetterOnly(feature.properties.NAME_3) === selectedName
        );

        if (selectedFeature) {
            const coordinates = selectedFeature.geometry.coordinates[0][0];
            if (coordinates && coordinates.length === 2) {
                const newRegion = {
                    feature: selectedFeature,
                    color: getRandomColor(),
                };
                setSelectedRegions((prevRegions) => [...prevRegions, newRegion]);
                setErrorMessage('');
            } else {
                setErrorMessage('Coordinates not found or invalid format for the selected region.');
            }
        } else {
            setErrorMessage('Selected region not found.');
        }
    };

    const getRegionStyle = (feature) => {
        const selectedRegion = selectedRegions.find(
            (region) => (region.feature.properties.NAME_3 === feature.properties.NAME_3)
        );
        return {
            weight: 2,
            opacity: 1,
            fillOpacity: 0.7,
            color: selectedRegion ? selectedRegion.color : 'green',
            fillColor: selectedRegion ? selectedRegion.color : 'transparent',
        };
    };

    useEffect(() => {
        if (regionSelected) {
            handleSubSubRegionSelect(regionSelected);
        }
    }, [regionSelected]);

    useEffect(() => {
        if (news.length > 0) {
            news.forEach(item => {
                handleSubSubRegionSelect(item.focusLocation);
            });
        }
    }, [news]);

    return (
        <div>
            <div className="relative z-10">
                {errorMessage && <p className='text-red-600 text-center'>{errorMessage}</p>}
                <MapContainer ref={mapRef} className='w-full rounded-lg pt-8 p-2' style={{ height: '632px' }} center={[30.3753, 69.3451]} zoom={6}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {PAK_adm3 && (
                        <GeoJSON
                            data={PAK_adm3}
                            style={getRegionStyle}
                            onEachFeature={(feature, layer) => {
                                layer.on({
                                    click: () => {},
                                });
                            }}
                        />
                    )}
                    {selectedRegions.map((region, index) => (
                        <Marker
                            key={index}
                            position={[
                                region.feature.geometry.coordinates[0][0][1],
                                region.feature.geometry.coordinates[0][0][0],
                            ]}
                            icon={defaultMarker}
                            eventHandlers={{
                                click: () => {
                                    const bounds = L.geoJSON(region.feature).getBounds();
                                    if (mapRef.current) {
                                        mapRef.current.flyToBounds(bounds);
                                    }
                                },
                                mouseover: (e) => {
                                    e.target.openPopup();
                                },
                                mouseout: (e) => {
                                    e.target.closePopup();
                                }
                            }}
                        >
                            <Popup>
                                {region.feature.properties.NAME_3}
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
};

export default MapComponent;
