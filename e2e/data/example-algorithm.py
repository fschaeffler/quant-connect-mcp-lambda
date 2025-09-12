# region imports
from datetime import datetime, timedelta
from AlgorithmImports import *
# endregion

class TestAlgorithm(QCAlgorithm):

    def initialize(self):
        self.set_end_date(datetime.now())
        self.set_start_date(self.end_date - timedelta(30))
        self.set_cash(100000)
        self.add_equity("SPY", Resolution.MINUTE)

    def on_data(self, data: Slice):
        if not self.portfolio.invested:
            self.set_holdings("SPY", 0.5)