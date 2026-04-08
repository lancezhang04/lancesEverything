import yaml
from pathlib import Path
from typing import Dict, List, Any

from .models import Region, FactorPremiums, EquityConfig, PortfolioHolding


class ConfigManager:
    def __init__(self, config_path: str = "config.yaml"):
        # Look for config.yaml in the project root (parent of backend directory)
        if not Path(config_path).exists():
            # Try parent directory (project root)
            config_path = Path(__file__).parent.parent.parent.parent / "config.yaml"
        self.config_path = Path(config_path)
        self._config_data = None

    def load(self) -> Dict[str, Any]:
        """Load configuration from YAML file."""
        with open(self.config_path, 'r') as f:
            self._config_data = yaml.safe_load(f)
        return self._config_data

    def save(self, config_data: Dict[str, Any]) -> None:
        """Save configuration to YAML file."""
        with open(self.config_path, 'w') as f:
            yaml.dump(config_data, f, default_flow_style=False, sort_keys=False)
        self._config_data = config_data

    @property
    def config_data(self) -> Dict[str, Any]:
        if self._config_data is None:
            self.load()
        return self._config_data

    def get_equities_config(self) -> Dict[str, EquityConfig]:
        """Get equity configurations."""
        return {
            ticker: EquityConfig(**data)
            for ticker, data in self.config_data["equities"].items()
        }

    def get_portfolio_holdings(self) -> List[PortfolioHolding]:
        """Get current portfolio holdings."""
        return [
            PortfolioHolding(**item)
            for item in self.config_data["current_portfolio"]
        ]

    def get_factor_premiums(self) -> FactorPremiums:
        """Get factor premiums."""
        fp = self.config_data["factor_premiums"]
        return FactorPremiums(
            rm_rf=fp["Rm-Rf"],
            hml=fp["HML"],
            smb=fp["SMB"],
            rmw=fp["RMW"],
            cma=fp["CMA"],
            rf=fp["Rf"],
            inflation=fp["inflation"],
            vol=fp["vol"]
        )

    def get_target_value_loadings(self) -> Dict[Region, float]:
        """Get target value loadings by region."""
        return {
            Region[k]: v
            for k, v in self.config_data["target_value_loadings"].items()
        }

    def update_factor_premiums(self, premiums: FactorPremiums) -> None:
        """Update factor premiums in config."""
        self.config_data["factor_premiums"] = {
            "Rm-Rf": premiums.rm_rf,
            "HML": premiums.hml,
            "SMB": premiums.smb,
            "RMW": premiums.rmw,
            "CMA": premiums.cma,
            "Rf": premiums.rf,
            "inflation": premiums.inflation,
            "vol": premiums.vol
        }
        self.save(self.config_data)

    def update_equity_config(self, ticker: str, equity_config: EquityConfig) -> None:
        """Update specific equity configuration."""
        self.config_data["equities"][ticker] = {
            "market_loading": equity_config.market_loading,
            "size_loading": equity_config.size_loading,
            "value_loading": equity_config.value_loading,
            "profitability_loading": equity_config.profitability_loading,
            "investment_loading": equity_config.investment_loading,
            "region": equity_config.region.value,
            "fractional": equity_config.fractional
        }
        self.save(self.config_data)

    def update_target_value_loadings(self, loadings: Dict[Region, float]) -> None:
        """Update target value loadings."""
        self.config_data["target_value_loadings"] = {
            region.value: loading
            for region, loading in loadings.items()
        }
        self.save(self.config_data)


# Global instance
config_manager = ConfigManager()
