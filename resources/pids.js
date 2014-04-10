function updatePredictions(apikey, rtu, numtrains) {
	$.getJSON("http://api.wmata.com/StationPrediction.svc/json/GetPrediction/" + rtu + "?callback=?&api_key=" + apikey, function(data) {
		$("#predictions tbody").children().remove();
		$.each(data.Trains.slice(0, numtrains), function(key, val) {
			if (val.Line !== "" && val.Car !== "" && val.DestinationName !== "" && val.Min !== "") {
				var lnclass, minclass;

				if (val.Line != "--") {
					lnclass = " class=\"" + val.Line.toLowerCase() + "\"";
				} else {
					lnclass = "";
				}

				if (val.Min == 'BRD' || val.Min == 'ARR') {
					minclass = " class=\"flash\"";
				} else {
					minclass = "";
				}

				$("#predictions tbody").append("<tr><td" + lnclass + ">" + val.Line + "</td><td>" + val.Car + "</td><td><span class='dest'>" + val.DestinationName + "</span></td><td" + minclass + ">" + val.Min + "</td></tr>");
			}
		});
	});
}

function updateIncidents(apikey) {
	var url = "http://api.wmata.com/Incidents.svc/json/Incidents" + "?callback=?&api_key=" + apikey;
	$.getJSON(url, function(data) {
		$("#incidents").marquee("pause");
		$("#lines").children().remove();
		$("#incidents").children().remove();
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
				$("#incidents").append("<li><span class=\"lines\">" + linespans.join('') + "</span>" + value.Description + "</li>");
			});
		}
		$("#incidents").marquee("update");
		$("#incidents").marquee("resume");
	});
}

function updateClock() {
	var curTime = moment();
	$('#clock').text(curTime.format('h:mm A'));

	if (curTime.hour() < 9) {
		updateBikeIndicator();
	} else {
		$('#bikeindicator').removeClass();
	}
}

function updateBikeIndicator() {
	var bikeOK = true;
	var url = "http://api.openweathermap.org/data/2.5/forecast?id=4370890";

	$.getJSON(url, function(forecastData) {
		$(forecastData.list).each(function() {
			var forecastTime = moment(this.dt * 1000);
			if (forecastTime.isSame(moment(), 'day')) {
				if ([5,8,11,14,17].indexOf(forecastTime.hour())) {
					//calculate bike status here
				}
			}
		});
	});
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

function initializeDisplay(apikey, rtu, numtrains) {
	var url = "http://api.wmata.com/Rail.svc/json/JStationInfo?StationCode=" + rtu + "&callback=?&api_key=" + apikey;

	$.getJSON(url, function(data) {
		var rtus, SECOND, MINUTE, doUpdatePred, doUpdateIncidents, intervalIDPred, intervalIDIncidents, intervalUpdateClock, intervalIDWeather;
		SECOND = 1000;
		MINUTE = 60;

		rtus = [rtu];

		$('#stationname').text(data.Name);
		if (data.StationTogether1 !== '') {
			rtus.push(data.StationTogether1);
		}

		doUpdatePred = function(){updatePredictions(apikey, rtus.join(','), numtrains);};
		doUpdatePred();
		intervalIDPred = setInterval(doUpdatePred, 20 * SECOND);

		$("#incidents").marquee({yScroll: "bottom", pauseSpeed: 1500, scrollSpeed: 10, pauseOnHover: false,
			beforeshow: function ($marquee, $li) {
				var lines = $li.find(".lines");
				$("#lines").html(lines.html()).fadeIn(1000);
			},
			aftershow: function ($marquee, $li) {
				$("#lines").hide();
			}
		});

		doUpdateIncidents = function(){updateIncidents(apikey);};
		doUpdateIncidents();
		intervalIDIncidents = setInterval(doUpdateIncidents, 120 * SECOND);

		updateClock();
		intervalUpdateClock = setInterval(updateClock, 60 * SECOND);

		updateWeather();
		intervalIDWeather = setInterval(updateWeather, 5 * MINUTE * SECOND);
	});
}

$(document).ready(function() {
	var newsize, oneRow, empx, estCrawlHeight, availableSpace, numTrains, error;

	newsize = ((($(window).width() * 62.5) / $('#predictions').outerWidth()) * 0.95);

	oneRow = $('#predictions tbody tr').outerHeight();
	empx = (10 * newsize) / 62.5;
	estCrawlHeight = 6 * empx;
	availableSpace = ($(window).height() - $('#stationname').outerHeight() - $('#predictions').outerHeight() + oneRow - estCrawlHeight);

	numTrains = Math.floor(availableSpace/oneRow);

	error = false;

	if (typeof apikey === 'undefined') {
		$('#predictions tbody').append('<tr class="flash"><td colspan="4">Error: API key not defined.</td></tr>');
		error = true;
	}

	if (typeof rtu === 'undefined') {
		$('#predictions tbody').append('<tr class="flash"><td colspan="4">Error: Station RTU not defined.</td></tr>');
		error = true;
	}

	if (!error) {
		initializeDisplay(apikey, rtu, numTrains);
	}
});
