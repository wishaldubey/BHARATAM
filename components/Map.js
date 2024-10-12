import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { Icon, Style, Stroke } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import { getDistance } from 'ol/sphere';
import ol, { DoubleClickZoom, KeyboardZoom, MouseWheelZoom } from 'ol/interaction';
import { Zoom } from 'ol/control';
import { Circle } from 'ol/geom';
const hintMul = 5000000 / 20000; //5000000 for all countries (20,000 km)

const MapComponent = ({ ws, session, pinPoint, setPinPoint, answerShown, location, setKm, guessing, multiplayerSentGuess, multiplayerState, showHint, currentId, round, gameOptions }) => {
  const mapRef = useRef();
  const [map, setMap] = useState(null);
  const [randomOffsetS, setRandomOffsetS] = useState([0, 0]);
  const plopSound = useRef();
  const vectorSource = useRef(new VectorSource());

  function drawHint(initialMap, location, randomOffset) {
    let lat = location.lat;
    let long = location.long;
    let center = fromLonLat([long, lat]);
    center = [center[0] + randomOffset[0], center[1] + randomOffset[1]];
    const circle = new Feature(new Circle(center, hintMul * gameOptions.maxDist));
    vectorSource.current.addFeature(circle);

    const circleLayer = new VectorLayer({
      source: new VectorSource({
        features: [circle],
      }),
      style: new Style({
        stroke: new Stroke({
          color: '#f00',
          width: 2,
        }),
      }),
    });
    initialMap.addLayer(circleLayer);
  }

  useEffect(() => {
    const initialMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
  source: new XYZ({
    url: 'https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg',
  }),
}),
        new VectorLayer({ source: vectorSource.current }),
      ],
      view: new View({
        center: fromLonLat([2, 35]),
        zoom: 1,
        zoomFactor: 2.5,
      }),
    });

    var duration = 400;
    initialMap.addControl(new Zoom({
      duration: duration,
    }));
    initialMap.addInteraction(new MouseWheelZoom({
      duration: duration,
    }));
    initialMap.addInteraction(new DoubleClickZoom({
      duration: duration,
    }));
    initialMap.addInteraction(new KeyboardZoom({
      duration: duration,
    }));

    function onMapClick(e) {
      if (!answerShown && !guessing && (!multiplayerState?.inGame || (multiplayerState?.inGame && !multiplayerState?.gameData?.players.find(p => p.id === multiplayerState?.gameData?.myId)?.final))) {
        const clickedCoord = initialMap.getEventCoordinate(e.originalEvent);
        const clickedLatLong = toLonLat(clickedCoord);
        console.log(clickedLatLong);
        setPinPoint({ lat: clickedLatLong[1], lng: clickedLatLong[0] });

        if (multiplayerState?.inGame && multiplayerState.gameData?.state === "guess" && ws) {
          console.log("pinpoint1", pinPoint);
          var pinpointLatLong = [clickedLatLong[1], clickedLatLong[0]];
          ws.send(JSON.stringify({ type: "place", latLong: pinpointLatLong, final: false }));
        }

        if (plopSound.current) plopSound.current.play();
      }
    }
    initialMap.on('click', onMapClick);

    setMap(initialMap);

    return () => {
      initialMap.setTarget(undefined);
      initialMap.un('click', onMapClick);
    };
  }, [answerShown, setPinPoint, guessing, multiplayerState, ws]);

  useEffect(() => {
    if (!map) return;

    vectorSource.current.clear();

    for (let i = 0; i < 2; i++) {
      map.getLayers().getArray().forEach((layer) => {
        if (layer instanceof VectorLayer) {
          map.removeLayer(layer);
        }
      });
    }

    if (location && showHint) drawHint(map, location, randomOffsetS, gameOptions.maxDist);
    if (pinPoint) {
      const pinFeature = new Feature({
        geometry: new Point(fromLonLat([pinPoint.lng, pinPoint.lat])),
      });
      const pinLayer = new VectorLayer({
        source: new VectorSource({
          features: [pinFeature],
        }),
        style: new Style({
          image: new Icon({
            anchor: [0.5, 1],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            scale: 0.45,
            src: '/src.png',
          }),
        }),
      });
      map.addLayer(pinLayer);
    }

    if (answerShown && location && pinPoint) {
      const lineLayer = new VectorLayer({
        source: new VectorSource({
          features: [
            new Feature({
              geometry: new LineString([
                fromLonLat([pinPoint.lng, pinPoint.lat]),
                fromLonLat([location.long, location.lat]),
              ]),
            }),
          ],
        }),
        style: new Style({
          stroke: new Stroke({
            color: '#f00',
            width: 2,
          }),
        }),
      });

      map.addLayer(lineLayer);
      const destFeature = new Feature({
        geometry: new Point(fromLonLat([location.long, location.lat])),
      });
      const pinLayer = new VectorLayer({
        source: new VectorSource({
          features: [destFeature],
        }),
        style: new Style({
          image: new Icon({
            anchor: [0.5, 1],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            scale: 0.45,
            src: '/dest.png',
          }),
        }),
      });
      map.addLayer(pinLayer);

      if (multiplayerState?.inGame) {
        multiplayerState?.gameData?.players.forEach((player) => {
          if (player.id === multiplayerState?.gameData?.myId) return;
          if (player.final && player.guess) {
            const playerFeature = new Feature({
              geometry: new Point(fromLonLat([player.guess[1], player.guess[0]])),
            });
            const playerLayer = new VectorLayer({
              source: new VectorSource({
                features: [playerFeature],
              }),
              style: new Style({
                image: new Icon({
                  anchor: [0.5, 1],
                  anchorXUnits: 'fraction',
                  anchorYUnits: 'fraction',
                  scale: 0.45,
                  src: '/src2.png',
                }),
              }),
            });
            map.addLayer(playerLayer);
          }
        });
      }

      setTimeout(() => {
        map.getView().animate({ center: fromLonLat([location.long, location.lat]), zoom: 5, duration: 3000 });
      }, 100);

      let distanceInKm = getDistance([pinPoint.lng, pinPoint.lat], [location.long, location.lat]) / 1000;
      if (distanceInKm > 100) distanceInKm = Math.round(distanceInKm);
      else if (distanceInKm > 10) distanceInKm = parseFloat(distanceInKm.toFixed(1));
      else distanceInKm = parseFloat(distanceInKm.toFixed(2));
      setKm(distanceInKm);
    }

  }, [map, pinPoint, answerShown, location, setKm, randomOffsetS, showHint]);

  useState(() => {
    let maxPivots = [0, 0];
    const radiusProj = hintMul * gameOptions.maxDist;

    const randomAngle = Math.random() * 2 * Math.PI;
    const randomRadius = Math.random() * radiusProj;
    maxPivots[0] += Math.cos(randomAngle) * randomRadius;
    maxPivots[1] += Math.sin(randomAngle) * randomRadius;

    setRandomOffsetS([maxPivots[0], maxPivots[1]]);
  }, [location, gameOptions]);

  return (
    <>
      <div ref={mapRef} id="miniMapContent"></div>
      <audio ref={plopSound} src="/plop.mp3" preload="auto"></audio>
    </>
  );
};

export default MapComponent;
