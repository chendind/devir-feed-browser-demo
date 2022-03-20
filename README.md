### FEED BROWSER
Using our websockets API - available at https://api.deriv.com - build a small application with the following features:
- show a graph of feed data, using the https://api.deriv.com/api- explorer/#ticks_history call.
- support zoom in/out and pan (to scroll back to historical data).
- update the graph as new data arrives (see the subscribe:1 parameter).
- shows data as ticks when zoomed in, and candles when zoomed out (style parameter).
- There should be a dropdown or similar UI element to select the symbol, using R_50 as the default (see https://api.deriv.com/api-explorer/#active_symbols to get the full list). Consider design choices that might help with efficient rendering and caching behaviour.