google.load('visualization', '1', {});
$(document).ready(function() {
		/*
		 * Address Help tool-tip
		 */
		$('#help-address').tooltip();
		/*
		* Set up various variables
		*/
		var ctt = {}; // The local master object: ctt: (C)hicago (T)ree (T)rim
		ctt.mapDOM = document.getElementById('theMap'); // the DOM object (div) in which to place the Google Map.
		ctt.CenterLatLng = new google.maps.LatLng('41.845', '-87.669'); //initial center of the map
		ctt.treetrimLayer = null; // the tree trim data map layer
		ctt.treetrimTableId = '3028961'; // the Google Fusion Table ID for Tree Trim data
		ctt.treetrimColumn = 'Location'; // the Fusion Table column than holds the tree trim location data
		ctt.wardLayer = null; // The Ward boundary map layer
		ctt.wardTableId = '3057562'; // The Google Fusion Table ID for Ward Boundary data
		ctt.wardColumn = 'geometry'; // The Fusion Table column that holds the Ward location data
		ctt.queryString = null; // The Tree Trim data query string
		ctt.countQueryString = null; // The tree trim data selection count
		ctt.insertAnd = ''; // set to 'AND' if the ctt.queryString needs an AND clause
		ctt.geocoder = new google.maps.Geocoder(); // Google Maps geocoder object.
		ctt.searchRadius = '805'; // Search radius for address-based search.
		ctt.addrMarker = false; // Google Maps marker object.
		ctt.isStatsRequest = false; // 'true' if we we need stats
		ctt.isAddressRequest = false; // 'true' if use filled out address.
		ctt.createDates = new Array(); // tree trim create dates.
		ctt.completeDates = new Array(); // tree trim completeion dates
		ctt.dateDiffs = new Array(); // difference between create and completion dates.
		ctt.total = new Array(); // holds the count of tree trim requests for bar graph.
		ctt.flot = new Array(); // the data to send to the bar graph
		ctt.openComplete = null; // used in title of bar graph div
		ctt.i = null; // iterator
		ctt.statResults = {}; // stats results object
		ctt.queryText = null; // query text used for stats
		ctt.numRows = null; // number of rows returned
		ctt.subStr = null; // used to insert commas in numbers
		ctt.subStr1 = null; // used to insert commas in numbers
		ctt.subStr2 = null; // used to insert commas in numbers
		ctt.regex = null; // used to insert commas in numbers
		ctt.myOptions = {
			zoom : 11,
			mapTypeControl : true,
			streetViewControl : false,
			panControl : false,
			zoomControl : true,
			zoomControlOptions : {
				style : google.maps.ZoomControlStyle.SMALL,
				position : google.maps.ControlPosition.LEFT_TOP
			},
			mapTypeId : google.maps.MapTypeId.TERRAIN
		}; // Google Map settings
		ctt.radiusCircle = null; // The radius circle object for the map
		ctt.radiusCircleOptions = null; // The radius circle's appearance
		/*
		 * Make the base map
		 */
		ctt.theMap = new google.maps.Map(ctt.mapDOM, ctt.myOptions); // The Google Map object
		ctt.theMap.setCenter(ctt.CenterLatLng);
		/* 
		 * Add the Tree Trim Data Layer.
		 */
		function setQueryString() {
			ctt.isStatsRequest = false;
			ctt.queryString = "SELECT " + ctt.treetrimColumn + " FROM " + ctt.treetrimTableId;
		}
		setQueryString();
		ctt.treetrimLayer = new google.maps.FusionTablesLayer(ctt.treetrimTableId, {
			query : ctt.queryString
		});
		ctt.treetrimLayer.setMap(ctt.theMap);
		displayCount(ctt.queryString,false);
		/*
		 * Tree Trim Data Listeners
		 */
		$("#map-refresh").click(function() {
			ctt.yearCreation = $("#year-creation").val();
			ctt.yearCompleted = $("#year-completed").val();
			ctt.address = $("#address").val();
			if (ctt.yearCreation == 'none' || ctt.yearCompleted == 'none')
			{
				$("#yearWarn").html('<div class="alert alert-error alert-block"><a class="close" data-dismiss="alert">x</a>Choose both a Request and Completion year.</div>');
			}
			else
			{
				setQueryString();
				if (ctt.yearCreation != 'all' || ctt.yearCompleted != 'all')
				{
					ctt.queryString = ctt.queryString + " WHERE";
					if (ctt.yearCreation != 'all')
					{
						ctt.queryString = ctt.queryString + " CreationDate >= '01/01/" + ctt.yearCreation + "' AND CreationDate <= '12/31/" + ctt.yearCreation + "'";
						ctt.insertAnd = ' AND';
					}
					if (ctt.yearCompleted != 'open' && ctt.yearCompleted != 'all')
					{
						ctt.isStatsRequest = true;
						ctt.queryString = ctt.queryString + ctt.insertAnd + " CompletionDate >= '01/01/" + ctt.yearCompleted + "' AND CompletionDate <= '12/31/" + ctt.yearCompleted + "'";
					}
					if (ctt.yearCompleted == 'open')
					{
						ctt.isStatsRequest = true;
						ctt.queryString = ctt.queryString + ctt.insertAnd + " Status LIKE '%Open%'";
					}
					if (ctt.yearCompleted == 'all')
					{
						ctt.isStatsRequest = true;
						ctt.queryString = ctt.queryString + ctt.insertAnd + " Status LIKE '%Completed%'";
					}
				}
				else
				{
					ctt.isStatsRequest = true;
					ctt.queryString = ctt.queryString + " WHERE Status LIKE '%Completed%'";
				}
				if (ctt.address != '')
				{
					ctt.isAddressRequest = true; 
					ctt.address += ' Chicago IL';
					ctt.geocoder.geocode({'address': ctt.address}, function(results, status)
					{
						if (status == google.maps.GeocoderStatus.OK)
						{
							if(ctt.addrMarker != false)
							{
								ctt.addrMarker.setMap(null);
							}
							ctt.theMap.setCenter(results[0].geometry.location);
							ctt.theMap.setZoom(14);
							ctt.addrMarker = new google.maps.Marker({
								position: results[0].geometry.location,
								map: ctt.theMap,
								animation: google.maps.Animation.DROP,
								title:ctt.address
							});
							if(ctt.radiusCircle != null)
							{
								ctt.radiusCircle.setMap(null);
							}
							drawSearchRadiusCircle(results[0].geometry.location);
							ctt.queryString = ctt.queryString + " AND ST_INTERSECTS(" + ctt.treetrimColumn + ", CIRCLE(LATLNG" + results[0].geometry.location.toString() + "," + ctt.searchRadius + "))";
							resetMap(ctt.queryString);
						}
						else
						{
							alert("We could not locate your address: " + status);
						}
					});
				}
				else
				{
					if(ctt.addrMarker != false)
					{
						ctt.addrMarker.setMap(null);
					}
					if(ctt.radiusCircle != null)
					{
						ctt.radiusCircle.setMap(null);
					}
					ctt.isAddressRequest = false;
					$("#statResults").fadeOut(function() { $("#statResults").html('');});
					resetMap(ctt.queryString);
				}
			}
		});
		/**
		 * Draw the 1/2 mile radius on the map
		 */
		function drawSearchRadiusCircle(theLocation) {
			ctt.radiusCircleOptions = {
				strokeColor: "#a0522d",
				strokeOpacity: 0.4,
				strokeWeight: 1,
				fillColor: "#a0522d",
				fillOpacity: 0.05,
				map: ctt.theMap,
				center: theLocation,
				clickable: false,
				zIndex: -1,
				radius: parseInt(ctt.searchRadius)
			};
			ctt.radiusCircle = new google.maps.Circle(ctt.radiusCircleOptions);
		}
		/**
		 * Reset the map back to show all tree trim data
		 */
		$("#map-all").click(function() {
			setQueryString();
			if(ctt.addrMarker != false)
			{
				ctt.addrMarker.setMap(null);
			}
			if(ctt.radiusCircle != null)
			{
				ctt.radiusCircle.setMap(null);
			}
			resetMap(ctt.queryString);
			$("#year-creation").val('none');
			$("#year-completed").val('none');
			$("#address").val('');
			$("#statResults").fadeOut(function() { $("#statResults").html('');});
		});
		/**
		 * Reload the tree trim map data based on new query string
		 */
		function resetMap(queryString)
		{
			ctt.treetrimLayer.setMap(null);
			ctt.treetrimLayer = new google.maps.FusionTablesLayer(
					ctt.treetrimTableId, {
						query : queryString
					});
			ctt.treetrimLayer.setMap(ctt.theMap);
			displayCount(queryString);
		}
		/**
		 * Get the Ward Layer
		 */
		ctt.wardLayer = new google.maps.FusionTablesLayer(ctt.wardTableId, {
			query : "SELECT " + ctt.wardColumn + " FROM " + ctt.wardTableId
		});
		/**
		 * Ward Layer Event Listener
		 */
		$("#wards").click(function() {
			if ($("#wards").is(':checked')) {
				ctt.treetrimLayer.setMap(null);
				ctt.wardLayer.setMap(ctt.theMap);
				ctt.treetrimLayer.setMap(ctt.theMap);
			} else {
				ctt.wardLayer.setMap(null);
			}
		});
		/**
		 * Getting Tree Trim Count
		 */
		function displayCount(queryString) {
			$("#numResults").fadeOut(function() {
				$("#numResults").html('<div class="alert"><strong>Calculating...</strong></div>');
			});
			$("#numResults").fadeIn();
			ctt.countQueryString = queryString.replace("SELECT " + ctt.treetrimColumn,
					"SELECT Count() ");
			getFTQuery(ctt.countQueryString).send(displaySearchCount);
			if(ctt.isStatsRequest && ctt.isAddressRequest)
			{
				displayStatistics(queryString);
			}
		}
		/**
		 * Get the COUNT of the tree trim requests
		 */
		function getFTQuery(sql) {
			ctt.queryText = encodeURIComponent(sql);
			return new google.visualization.Query('http://www.google.com/fusiontables/gvizdata?tq=' + ctt.queryText);
		}
		/**
		 * Display the COUNT of the tree trims in the results DOM div
		 */
		function displaySearchCount(response) {
			ctt.numRows = 0;
			if (response.getDataTable().getNumberOfRows() > 0) {
				ctt.numRows = parseInt(response.getDataTable().getValue(0, 0));
			}
			$("#numResults").fadeOut(function() {
				$('#statsResults').fadeOut();
				$("#numResults").html('<div class="alert alert-info"><strong>' + addCommas(ctt.numRows) + '</strong> Requests Selected</div>');
			});
			$("#numResults").fadeIn();
		}
		/**
		 * Query Fusion Tables for data needed to do the tree trim statistics
		 */
		function displayStatistics(queryString)
		{
			ctt.statQueryString = queryString.replace("SELECT " + ctt.treetrimColumn, "SELECT CreationDate, CompletionDate");
			getFTQuery(ctt.statQueryString).send(processStatistics);
		}
		/**
		 * Create and display the statistics
		 */
		function processStatistics(response)
		{
			ctt.numStatsRows = parseInt(response.getDataTable().getNumberOfRows());
			for(ctt.i=1;ctt.i<=6;ctt.i++)
			{
				ctt.total[ctt.i] = 0;
			}

			for (ctt.i=0;ctt.i<ctt.numStatsRows;ctt.i++)
			{
				ctt.createDates[ctt.i] = new XDate(response.getDataTable().getValue(ctt.i,0));
				ctt.completeDates[ctt.i] = new XDate(response.getDataTable().getValue(ctt.i,1));
				ctt.openComplete = 'DAYS TO COMPLETE REQUESTS';
				if (ctt.completeDates[ctt.i] == '21600000')
				{
					ctt.openComplete = 'DAYS SINCE REQUESTS OPENED';
					ctt.completeDates[ctt.i] = new XDate();
				}
				ctt.dateDiffs[ctt.i] = ctt.createDates[ctt.i].diffDays(ctt.completeDates[ctt.i]);
				if(ctt.dateDiffs[ctt.i] < 100) { ctt.total[1]++; }
				else if(ctt.dateDiffs[ctt.i] < 200) { ctt.total[2]++; }
				else if(ctt.dateDiffs[ctt.i] < 300) { ctt.total[3]++; }
				else if(ctt.dateDiffs[ctt.i] < 400) { ctt.total[4]++; }
				else if(ctt.dateDiffs[ctt.i] < 500) { ctt.total[5]++; }
				else { ctt.total[6]++; }
			}
			ctt.statResults.min = jStat.min(ctt.dateDiffs);
			ctt.statResults.max = jStat.max(ctt.dateDiffs);
			ctt.statResults.mean = jStat.mean(ctt.dateDiffs);
			ctt.statResults.median = jStat.median(ctt.dateDiffs);
			ctt.statResults.stdev = jStat.stdev(ctt.dateDiffs);
			for(ctt.i=1;ctt.i<=6;ctt.i++)
			{
				ctt.flot[ctt.i] = [ctt.i,ctt.total[ctt.i]];
			}
			$("#statResults").fadeOut(function() {
				$("#statResults").html('<div class="alert alert-info"><strong>' + ctt.openComplete + '<br/>' + roundNum(ctt.statResults.min,0) + '</strong> minimum<br/><strong>' + roundNum(ctt.statResults.max,0) + '</strong> maximum<br/><strong>' + roundNum(ctt.statResults.mean,1) + '</strong> average<br/><strong>' + roundNum(ctt.statResults.median,1) + '</strong> median<br/><strong>' + roundNum(ctt.statResults.stdev,1) + '</strong> standard deviation<div id="flot" style="width:240px;height:100px"></div><p>&nbsp;<br/>requests - vertical&nbsp;&nbsp;|&nbsp;&nbsp;days - horizonal</p></div>');
				$.plot($("#flot"), [{ data: ctt.flot}],
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
		/**
		 * Add commas into numbers
		 */
		function addCommas(theStr) {
			theStr += '';
			ctt.subStr = theStr.split('.');
			ctt.subStr1 = ctt.subStr[0];
			ctt.subStr2 = ctt.subStr.length > 1 ? '.' + ctt.subStr[1] : '';
			ctt.regx = /(\d+)(\d{3})/;
			while (ctt.regx.test(ctt.subStr1))
			{
				ctt.subStr1 = ctt.subStr1.replace(ctt.regx, '$1' + ',' + '$2');
			}
			return ctt.subStr1 + ctt.subStr2;
		}
		/**
		 * Round numbers to the given decimal (dec)
		 */
		function roundNum(num, dec) {
			ctt.roundResult = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
			return ctt.roundResult;
		}
});