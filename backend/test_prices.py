import yfinance as yf

tickers = ['AVUV', 'AVES', 'AVDV']

for ticker_str in tickers:
    print(f"\n=== Testing {ticker_str} ===")
    ticker = yf.Ticker(ticker_str)

    print("1. Trying fast_info...")
    try:
        price = ticker.fast_info.last_price
        print(f"   fast_info.last_price: ${price}")
    except Exception as e:
        print(f"   Error: {e}")

    print("2. Trying info dict...")
    try:
        info = ticker.info
        print(f"   regularMarketPrice: {info.get('regularMarketPrice')}")
        print(f"   currentPrice: {info.get('currentPrice')}")
        print(f"   previousClose: {info.get('previousClose')}")
    except Exception as e:
        print(f"   Error: {e}")

    print("3. Trying history...")
    try:
        hist = ticker.history(period='1d')
        if not hist.empty:
            print(f"   Last close: ${hist['Close'].iloc[-1]}")
        else:
            print("   No history data")
    except Exception as e:
        print(f"   Error: {e}")
