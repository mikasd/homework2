const layers = [
  { url: "https://services8.arcgis.com/EeR7HCTxo4wVv6wN/arcgis/rest/services/us_outline/FeatureServer", text: "us border", color: "#004208", enableLookup: false, layer: null },
  { url: "https://services8.arcgis.com/EeR7HCTxo4wVv6wN/arcgis/rest/services/us_states/FeatureServer", text: "states", color: "#00f5e0", enableLookup: true, fieldList: ["STATE"], layer: null },
  { url: "https://services8.arcgis.com/EeR7HCTxo4wVv6wN/arcgis/rest/services/counties/FeatureServer", text: "counties", color: "#f50000", enableLookup: true, fieldList: ["COUNTY", "STATE"], layer: null },
  { url: "https://services8.arcgis.com/EeR7HCTxo4wVv6wN/arcgis/rest/services/counties/FeatureServer", text: "congressional districts", color: "#f5a700", enableLookup: false, layer: null }
];

function makeLengendItem(index) {
  let layerList = document.getElementById("layerToggle");
  let label = document.createElement("label");
  label.style.color = layers[index].color;
  let box = document.createElement("input");
  box.setAttribute("type", "checkbox");
  box.setAttribute("id", "layer" + index);
  label.appendChild(box);
  label.innerHTML += layers[index].text;
  layerList.appendChild(label);
  if (index < layers.length - 1)
    layerList.appendChild(document.createElement("br"));

  document.getElementById("layer" + index)
    .addEventListener("change", function () {
      let id = parseInt(this.id.substr(5));
      layers[id].layer.visible = this.checked;
    });
}

function importLayers(map, FeatureLayer, Color) {
  for (let i = 0; i < layers.length; i++) {
    try {
      let layerFiller = new Color(layers[i].color);
      layerFiller.a = 0.2;

      let layerStyle = {
        type: "simple",
        symbol: {
          type: "simple-fill",
          color: layerFiller,
          outline: {
            width: 2,
            color: layers[i].color
          }
        }
      };

      let layerFields = layers[i].enableLookup ? layers[i].fieldList : [];

      layers[i].layer = new FeatureLayer({
        id: "layer" + i,
        url: layers[i].url,
        visible: false,
        renderer: layerStyle,
        outFields: layerFields,
        opacity: 0.20,
      });

      map.add(layers[i].layer);

      makeLengendItem(i);

    }
    catch (err) {
      console.log("error =>" + err)
    }
  }
}

function getActiveLayer() {
  for (let j = 0; j < layers.length; j++) {
    //filters out geojson layers without state/county info
    if (layers[j].layer.visible && layers[j].enableLookup)
      return layers[j].layer;
  }
  return null;
}

function padZeroes(val, num) {
  let stringvalue = String(val);
  while (stringvalue.length < num)
    stringvalue = '0' + stringvalue;
  return stringvalue;
}

function generatePopup(props, mapPoint, view) {

  const token = '';

  let url = 'https://api.census.gov/data/2013/language?get=LAN7,LAN,EST,LANLABEL,NAME&for=';

  if (props.hasOwnProperty('COUNTY'))
    url += 'county:' + padZeroes(props.COUNTY, 3) + '&in=state:' + padZeroes(props.STATE, 2);
  else
    url += 'state:' + padZeroes(props.STATE, 2);

  url += '&key=' + token;

  fetch(url)
    .then(function (response) {
      response.json()
        .then(function (data) {
          const locName = data[1][4];
          let html = '<table>';
          for (let k = 1; k < data.length; k++) {
            if (parseInt(data[k][0]) !== 0 || parseInt(data[k][1]) === 625) {
              html += '<tr><td>' + data[k][3] + '</td>';
              html += '<td>' + Number(data[k][2]).toLocaleString() + '</td></tr>';
            }
          }
          html += '</table>';

          view.popup.open({
            title: locName,
            location: mapPoint,
            content: html
          });
        })
        .catch(function (err) {
          console.log(err + "caught error on fetch");
          view.popup.open({
            title: 'Error',
            location: mapPoint,
            content: '<p>No language data for the selected area</p>'
          });
        });
    });
}

function queryFeatureLayer(point, view) {
  let query = {
    geometry: point,
    distance: 1,
    spatialRelationship: "intersects",
    outFields: ["*"],
    returnGeometry: true
  };
  let layer = getActiveLayer();
  if (layer) {
    layer.queryFeatures(query).then(function (result) {
      if (result.features.length > 0) {
        let feat = result.features[0];
        generatePopup(feat.attributes, point, view);
      }
    });
  }
}



