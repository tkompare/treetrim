google.load('visualization', '1', {});
$(document).ready(function() {
		//Popover
		$('#help-address').tooltip();
		// Set up various variables
		var CenterLatLng = new google.maps.LatLng('41.845', '-87.669');
		var fusionTableId = '3028961';
		var geoColumn = 'Location';
		var fusionLayer = null;
		var queryString = null;
		var insertAnd = '';
		var geocoder = new google.maps.Geocoder();
		var searchRadius = '805';
		var myOptions = {
			zoom : 11,
			mapTypeControl : true,
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
		$("#map-refresh").click(function() {
			yearCreation = $("#year-creation").val();
			yearCompleted = $("#year-completed").val();
			address = $("#address").val();
			if (yearCreation != 'none' || yearCompleted != 'none')
			{
				setQueryString();
				if (yearCreation != 'all' || yearCompleted != 'all')
				{
					queryString = queryString + " WHERE";
				if (yearCreation != 'all')
					{
						queryString = queryString + " CreationDate >= '01/01/" + yearCreation + "' AND CreationDate <= '12/31/"+yearCreation+"'";
						insertAnd = ' AND';
				}
					if (yearCompleted != 'open' && yearCompleted != 'all')
					{
						queryString = queryString + insertAnd + " CompletionDate >= '01/01/" + yearCompleted + "' AND CompletionDate <= '12/31/"+yearCompleted+"'";
					}
					if (yearCompleted == 'open')
					{
						queryString = queryString + insertAnd + " Status LIKE '%Open%'";
					}
					if (yearCompleted == 'all')
					{
						queryString = queryString + insertAnd + " Status LIKE '%Completed%'";
					}
				}
				else
				{
					queryString = queryString + " WHERE Status LIKE '%Completed%'";
				}
				if (address != '')
				{
					address += ' Chicago IL';
					geocoder.geocode({'address': address}, function(results, status)
					{
						if (status == google.maps.GeocoderStatus.OK)
						{
							theMap.setCenter(results[0].geometry.location);
							theMap.setZoom(14);
							addrMarker = new google.maps.Marker({
								position: results[0].geometry.location,
								map: theMap,
								animation: google.maps.Animation.DROP,
								title:address
							});
							queryString = queryString + " AND ST_INTERSECTS(" + geoColumn + ", CIRCLE(LATLNG" + results[0].geometry.location.toString() + "," + searchRadius + "))";
							resetMap(queryString);
						}
						else
						{
							alert("We could not locate your address: " + status);
						}
					});
				}
				else
				{
					resetMap(queryString);
				}
			}
			else
			{
				$("#yearWarn").html('<div class="alert alert-error alert-block"><a class="close" data-dismiss="alert">x</a>Choose both a Request and Completion year.</div>');
			}
		});
		$("#map-all").click(function() {
			setQueryString();
			resetMap(queryString);
			$("#year-creation").val('none');
			$("#year-completed").val('none');
			$("#address").val('');
		});
		function resetMap(queryString)
		{
			fusionLayer.setMap(null);
			fusionLayer = new google.maps.FusionTablesLayer(
					fusionTableId, {
						query : queryString
					});
			fusionLayer.setMap(theMap);
			displayCount(queryString);
		}
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
				$("#numResults").html('<div class="alert"><strong>Calculating...</strong></div>');
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
				$("#numResults").html('<div class="alert alert-success"><strong>' + addCommas(numRows) + '</strong> Requests Selected</div>');
			});
			$("#numResults").fadeIn();
		}
});