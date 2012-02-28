google.load('visualization', '1', {});
$(document).ready(function() {
		// Set up various variables
		var CenterLatLng = new google.maps.LatLng('41.845', '-87.669');
		var fusionTableId = '3028961';
		var geoColumn = 'Location';
		var fusionLayer = null;
		var queryString = null;
		var myOptions = {
			zoom : 11,
			mapTypeControl : false,
			streetViewControl : false,
			panControl : false,
			zoomControl : true,
			zoomControlOptions : {
				style : google.maps.ZoomControlStyle.SMALL,
				position : google.maps.ControlPosition.LEFT_TOP
			},
			mapTypeId : google.maps.MapTypeId.ROADMAP
		};
		var mapDOM = document.getElementById('theMap');
		// Make the base map
		var theMap = new google.maps.Map(mapDOM, myOptions);
		theMap.setCenter(CenterLatLng);
		// Add the Tree Trim Data Layer.
		function setQueryString() {
			queryString = "SELECT " + geoColumn + " FROM " + fusionTableId;
		}
		setQueryString();
		fusionLayer = new google.maps.FusionTablesLayer(fusionTableId, {
			query : queryString
		});
		fusionLayer.setMap(theMap);
		displayCount(queryString);
		// Tree Trim Data Listeners
		$("#requests-all").click(
				function() {
					setQueryString();
					fusionLayer.setMap(null);
					fusionLayer = new google.maps.FusionTablesLayer(
							fusionTableId, {
								query : queryString
							});
					fusionLayer.setMap(theMap);
					displayCount(queryString);
				});
		$("#requests-completed").click(
				function() {
					setQueryString();
					queryString = queryString + " WHERE Status LIKE '%Completed%'";
					fusionLayer.setMap(null);
					fusionLayer = new google.maps.FusionTablesLayer(
							fusionTableId, {
								query : queryString
							});
					fusionLayer.setMap(theMap);
					displayCount(queryString);
				});
		$("#requests-pending").click(
				function() {
					setQueryString();
					queryString = queryString + " WHERE Status LIKE '%Open%'";
					fusionLayer.setMap(null);
					fusionLayer = new google.maps.FusionTablesLayer(
							fusionTableId, {
								query : queryString
							});
					fusionLayer.setMap(theMap);
					displayCount(queryString);
				});
		// Ward Layer Listeners
		var wardLayer = new google.maps.FusionTablesLayer(3057562, {
			query : "SELECT geometry FROM 3057562"
		});
		$("#wards").click(function() {
			if ($("#wards").is(':checked')) {
				fusionLayer.setMap(null);
				wardLayer.setMap(theMap);
				fusionLayer.setMap(theMap);
			} else {
				wardLayer.setMap(null);
			}
		});
		// Getting Tree Trim Count
		function getFTQuery(sql) {
			var queryText = encodeURIComponent(sql);
			return new google.visualization.Query(
					'http://www.google.com/fusiontables/gvizdata?tq='
							+ queryText);
		}
		function displayCount(queryString) {
			$("#numResults").fadeOut(function() {
				$("#numResults").html("Calculating count...");
			});
			$("#numResults").fadeIn();
			queryString = queryString.replace("SELECT " + geoColumn,
					"SELECT Count() ");
			// set the callback function
			getFTQuery(queryString).send(displaySearchCount);
		}
		// Add in commas into numbers
		function addCommas(nStr) {
			nStr += '';
			x = nStr.split('.');
			x1 = x[0];
			x2 = x.length > 1 ? '.' + x[1] : '';
			var regx = /(\d+)(\d{3})/;
			while (regx.test(x1)) {
				x1 = x1.replace(regx, '$1' + ',' + '$2');
			}
			return x1 + x2;
		}
		function displaySearchCount(response) {
			var numRows = 0;
			if (response.getDataTable().getNumberOfRows() > 0) {
				numRows = parseInt(response.getDataTable().getValue(0, 0));
			}
			$("#numResults").fadeOut(function() {
				$("#numResults").html('<strong>' + addCommas(numRows) + '</strong> requests');
			});
			$("#numResults").fadeIn();
		}
});