var marqueeInitialized = false;
var maxDisplayedTrains;
var intervalPredictions, intervalIncidents, intervalClock, intervalWeather;
var bikeOK = true;

function updatePredictions(apiKey, rtu, maxDisplayedTrains) {
	var url = "http://api.wmata.com/StationPrediction.svc/json/GetPrediction/" + rtu + "?callback=?&api_key=" + apiKey;

	$.getJSON(url)
	  .done(function(data) {
		var $tbody = $("#predictions tbody");
		$tbody.children().remove();
		$.each(data.Trains.slice(0, maxDisplayedTrains), function(key, train) {
			if (train.Line !== "" && train.Car !== "" && train.DestinationName !== "" && train.Min !== "") {
				var minclass = isNaN(train.Min) ? "flash" : "";

				var $newTrain = $(document.createElement('tr'));
				$newTrain.append($(document.createElement('td')).addClass(train.Line.toLowerCase()).text(train.Line));
				$newTrain.append($(document.createElement('td')).text(train.Car));
				$newTrain.append($(document.createElement('td')).addClass("dest").text(train.DestinationName));
				$newTrain.append($(document.createElement('td')).addClass(minclass).text(train.Min));
				$tbody.append($newTrain);
			}
		});
	  })
	  .fail(function(jqxhr, textStatus, error) {
		console.log("Request Failed: " + textStatus + ", " + error);
	});
}


function initMarquee () {
	$("#incidents").marquee({yScroll: "bottom", pauseSpeed: 1500, scrollSpeed: 10, pauseOnHover: false,
		beforeshow: function ($marquee, $li) {
			var lines = $li.find(".lines");
			$("#lines").html(lines.html()).fadeIn(1000);
		},
		aftershow: function () {
			$("#lines").hide();
		}
	});
}

function updateIncidents(apiKey) {
	var url = "http://api.wmata.com/Incidents.svc/json/Incidents" + "?callback=?&api_key=" + apiKey;
	var $incidents = $('#incidents');

	$.getJSON(url)
	  .done(function(data) {
		$incidents.marquee("pause");
		$("#lines").children().remove();
		$incidents.children().remove();
		if (data.Incidents.length > 0) {
			$.each(data.Incidents, function(key, value) {
				var lines, linespans;
				lines = value.LinesAffected.split(';');
				linespans = [];
				$.each(lines, function(key, value) {
					if (value !== '') {
						linespans.push("<span class=\"" + value.toLowerCase() + "\">&bull;</span>");
					}
				});
				$incidents.append("<li><span class=\"lines\">" + linespans.join('') + "</span>" + value.Description + "</li>");
			});
		}
		$incidents.marquee("update");
		$incidents.marquee("resume");
	  })
	  .fail(function( jqxhr, textStatus, error ) {
		console.log("Request Failed: " + textStatus + ", " + error);
	});

	if (!marqueeInitialized) {
		setTimeout(initMarquee, 5000);
		marqueeInitialized = true;
	}
}


function updateBikeIndicator() {
	var $bikeindicator = $('#bikeindicator');
	var curTime = moment();
	var url = "http://api.openweathermap.org/data/2.5/forecast?id=4370890";

	$bikeindicator.removeClass();

	$.getJSON(url)
	  .done(function(forecastData) {
		$(forecastData.list).each(function() {
			var forecastTime = moment(this.dt * 1000);
			if (forecastTime.isSame(curTime, 'day')) {
				if (forecastTime.hour() >= 8 && forecastTime.hour() <= 17) {
					if (Math.round(((this.main.temp - 273.15) * 1.8) + 32) < 50) {
						bikeOK = false;
					}
					if (typeof(this.rain) !== undefined) {
						if (this.rain['3h'] > 0) {
							bikeOK = false;
						}
					}
				}
			}
			if (bikeOK === false) {
				return false;
			}
		});
	  })
	  .fail(function(jqxhr, textStatus, error) {
		console.log("Request Failed: " + textStatus + ", " + error);
		bikeOK = null;
	});
	sessionStorage.setItem('bikeIndicatorUpdated', curTime.format('l'));
	sessionStorage.setItem('bikeOK', bikeOK);
	$bikeindicator.addClass(bikeOK.toString());
}

function updateClock() {
	var curTime = moment();

	$('#clock').text(curTime.format('h:mm A'));

	if (sessionStorage.getItem('bikeIndicatorUpdated') != curTime.format('l')) {
		updateBikeIndicator();
	} else {
		$('#bikeindicator').toggleClass(sessionStorage.getItem('bikeOK'), true);
	}
}

function updateWeather() {
	var url = "http://api.openweathermap.org/data/2.5/weather?id=4370890";

	$.getJSON(url, function(wxData) {
		var tempK = wxData.main.temp;
		var tempF = (tempK - 273) * 1.8 + 32;
		var tempStr = Math.round(tempF);

		var cond = wxData.weather[0].description;
		var condStr = cond.charAt(0).toUpperCase() + cond.slice(1);

		$('#wx span.obs').html(condStr);
		$('#wx span.temp').html(tempStr);
	});
}

function initializeDisplay(apiKey, rtu, maxDisplayedTrains) {
	var url = "http://api.wmata.com/Rail.svc/json/JStationInfo?StationCode=" + rtu + "&callback=?&api_key=" + apiKey;

	$.getJSON(url)
	  .done(function(data) {
		var rtus;
		var SECOND = 1000;

		rtus = [rtu];
		$('#stationname').text(data.Name);
		if (data.StationTogether1 !== '') {
			rtus.push(data.StationTogether1);
		}
		rtus = rtus.join('.');

		intervalPredictions = setInterval(updatePredictions, 20 * SECOND, apiKey, rtus, maxDisplayedTrains);
		intervalIncidents = setInterval(updateIncidents, 120 * SECOND, apiKey);
		intervalClock = setInterval(updateClock, 60 * SECOND);
		intervalWeather = setInterval(updateWeather, 300 * SECOND);

		updatePredictions(apiKey, rtus, maxDisplayedTrains);
		updateIncidents(apiKey);
		updateClock();
		updateWeather();
	  })
	  .fail(function(jqxhr, textStatus, error) {
		console.log("Request Failed: " + textStatus + ", " + error);
	});
}

$(document).ready(function() {
	var newsize, oneRow, empx, estCrawlHeight, availableSpace, error;

	newsize = ((($(window).width() * 62.5) / $('#predictions').outerWidth()) * 0.95);

	oneRow = $('#predictions tbody tr').outerHeight();
	empx = (10 * newsize) / 62.5;
	estCrawlHeight = 6 * empx;
	availableSpace = ($(window).height() - $('#stationname').outerHeight() - $('#predictions').outerHeight() + oneRow - estCrawlHeight);

	maxDisplayedTrains = Math.floor(availableSpace/oneRow);

	error = false;

	if (typeof apiKey === 'undefined') {
		$('#predictions tbody').append('<tr class="flash"><td colspan="4">Error: API key not defined.</td></tr>');
		error = true;
	}

	if (typeof rtu === 'undefined') {
		$('#predictions tbody').append('<tr class="flash"><td colspan="4">Error: Station RTU not defined.</td></tr>');
		error = true;
	}

	if (!error) {
		initializeDisplay(apiKey, rtu, maxDisplayedTrains);
	}
});
