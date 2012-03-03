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
		var countQueryString = null;
		var insertAnd = '';
		var geocoder = new google.maps.Geocoder();
		var searchRadius = '805';
		var addrMarker = false;
		var isStatsRequest = false;
		var isAddressRequest = false;
		var createDates = new Array();
		var completeDates = new Array();
		var dateDiffs = new Array();
		var total = new Array();
		var flot = new Array();
		var openComplete = null;
		var i = null; // iterator
		var statResults = {};
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
			isStatsRequest = false;
			queryString = "SELECT " + geoColumn + " FROM " + fusionTableId;
		}
		setQueryString();
		fusionLayer = new google.maps.FusionTablesLayer(fusionTableId, {
			query : queryString
		});
		fusionLayer.setMap(theMap);
		displayCount(queryString,false);
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
						isStatsRequest = true;
						queryString = queryString + insertAnd + " CompletionDate >= '01/01/" + yearCompleted + "' AND CompletionDate <= '12/31/"+yearCompleted+"'";
					}
					if (yearCompleted == 'open')
					{
						isStatsRequest = true;
						queryString = queryString + insertAnd + " Status LIKE '%Open%'";
					}
					if (yearCompleted == 'all')
					{
						isStatsRequest = true;
						queryString = queryString + insertAnd + " Status LIKE '%Completed%'";
					}
				}
				else
				{
					isStatsRequest = true;
					queryString = queryString + " WHERE Status LIKE '%Completed%'";
				}
				if (address != '')
				{
					isAddressRequest = true; 
					address += ' Chicago IL';
					geocoder.geocode({'address': address}, function(results, status)
					{
						if (status == google.maps.GeocoderStatus.OK)
						{
							if(addrMarker != false)
							{
								addrMarker.setMap(null);
						  }
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
					isAddressRequest = false;
					$("#statResults").fadeOut(function() { $("#statResults").html('');});
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
			if(addrMarker != false)
			{
				addrMarker.setMap(null);
			}
			resetMap(queryString);
			$("#year-creation").val('none');
			$("#year-completed").val('none');
			$("#address").val('');
			$("#statResults").fadeOut(function() { $("#statResults").html('');});
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
		/*
		 * Getting Tree Trim Count
		 */
		function displayCount(queryString) {
			$("#numResults").fadeOut(function() {
				$("#numResults").html('<div class="alert"><strong>Calculating...</strong></div>');
			});
			$("#numResults").fadeIn();
			countQueryString = queryString.replace("SELECT " + geoColumn,
					"SELECT Count() ");
			getFTQuery(countQueryString).send(displaySearchCount);
			if(isStatsRequest && isAddressRequest)
			{
				displayStatistics(queryString);
			}
		}
		function getFTQuery(sql) {
			var queryText = encodeURIComponent(sql);
			return new google.visualization.Query(
					'http://www.google.com/fusiontables/gvizdata?tq='
							+ queryText);
		}
		function displaySearchCount(response) {
			var numRows = 0;
			if (response.getDataTable().getNumberOfRows() > 0) {
				numRows = parseInt(response.getDataTable().getValue(0, 0));
			}
			$("#numResults").fadeOut(function() {
				$('#statsResults').fadeOut();
				$("#numResults").html('<div class="alert alert-success"><strong>' + addCommas(numRows) + '</strong> Requests Selected</div>');
			});
			$("#numResults").fadeIn();
		}
		// Add in commas into numbers
		function addCommas(nStr) {
			nStr += '';
			x = nStr.split('.');
			x1 = x[0];
			x2 = x.length > 1 ? '.' + x[1] : '';
			var regx = /(\d+)(\d{3})/;
			while (regx.test(x1))
			{
				x1 = x1.replace(regx, '$1' + ',' + '$2');
			}
			return x1 + x2;
		}
		/*
		 * Do some statistics on results
		 */
		function displayStatistics(queryString)
		{
			statQueryString = queryString.replace("SELECT " + geoColumn,
			"SELECT CreationDate, CompletionDate");
			//alert(statQueryString);
			getFTQuery(statQueryString).send(processStatistics);
		}
		function processStatistics(response)
		{
			numRows = parseInt(response.getDataTable().getNumberOfRows());
			for(i=1;i<=6;i++)
			{
				total[i] = 0;
			}

			for (i=0;i<numRows;i++)
			{
				createDates[i] = new XDate(response.getDataTable().getValue(i,0));
				completeDates[i] = new XDate(response.getDataTable().getValue(i,1));
				openComplete = 'DAYS TO COMPLETE REQUESTS';
				if (completeDates[i] == '21600000')
				{
					openComplete = 'DAYS SINCE REQUESTS OPENED';
					completeDates[i] = new XDate();
				}
				dateDiffs[i] = createDates[i].diffDays(completeDates[i]);
				if(dateDiffs[i] < 100) { total[1]++; }
				else if(dateDiffs[i] < 200) { total[2]++; }
				else if(dateDiffs[i] < 300) { total[3]++; }
				else if(dateDiffs[i] < 400) { total[4]++; }
				else if(dateDiffs[i] < 500) { total[5]++; }
				else { total[6]++; }
			}
			statResults.min = jStat.min(dateDiffs);
			statResults.max = jStat.max(dateDiffs);
			statResults.mean = jStat.mean(dateDiffs);
			statResults.median = jStat.median(dateDiffs);
			statResults.stdev = jStat.stdev(dateDiffs);
			for(i=1;i<=6;i++)
			{
				flot[i] = [i,total[i]];
			}
			$("#statResults").fadeOut(function() {
				$("#statResults").html('<div class="alert alert-info"><strong>' + openComplete + '<br/>' + roundNum(statResults.min,0) + '</strong> minimum<br/><strong>' + roundNum(statResults.max,0) + '</strong> maximum<br/><strong>' + roundNum(statResults.mean,1) + '</strong> average<br/><strong>' + roundNum(statResults.median,1) + '</strong> median<br/><strong>' + roundNum(statResults.stdev,1) + '</strong> standard deviation<div id="flot" style="width:240px;height:100px"></div><p>&nbsp;<br/>requests - vertical&nbsp;&nbsp;|&nbsp;&nbsp;days - horizonal</p></div>');
				$.plot($("#flot"), [{ data: flot}],
							{
								bars: { show: true },
								xaxis: {
									ticks: [[1,"0"],[2,"100"],[3,"200"],[4,"300"],[5,"400"],[6,"500"],[7,"&#x221E;"]]
								}
							}
				);
			});
			$("#statResults").fadeIn();
		}
		function roundNum(num, dec) {
			var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
			return result;
		}
});