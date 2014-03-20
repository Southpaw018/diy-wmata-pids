function getwx() {
    var url ="http://api.openweathermap.org/data/2.5/weather?id=4370890";

    $.getJSON(url, function(wxData) {
        var tempK = wxData.main.temp;
        var tempF = (tempK - 273) * 1.8 + 32;
        var tempStr = Math.round(tempF) + "&thinsp;&deg;F";

        var cond = wxData.weather[0].description;
        var condStr = cond.charAt(0).toUpperCase() + cond.slice(1);

        $('#wx span.obs').html(condStr);
        $('#wx span.temp').html(tempStr);
    });
}

