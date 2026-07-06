import yaml
from pathlib import Path
from typing import Dict, List, Any, Optional

from .models import Region, FactorPremiums, EquityConfig, PortfolioHolding


class ConfigManager:
    def __init__(self, config_path: str = "config.yaml"):
        # Look for config.yaml in the project root (parent of backend directory)
        if not Path(config_path).exists():
            # Try parent directory (project root)
            config_path = Path(__file__).parent.parent.parent.parent / "config.yaml"
        self.config_path = Path(config_path)
        self._config_data = None
        self._portfolio_override: Optional[List[Dict[str, Any]]] = None
        self._vol_override: Optional[float] = None

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
        """Get current portfolio holdings (uses override if set)."""
        source = self._portfolio_override if self._portfolio_override is not None else self.config_data["current_portfolio"]
        return [
            PortfolioHolding(**item)
            for item in source
        ]

    def get_portfolio_templates(self) -> Dict[str, Any]:
        """Get available portfolio templates."""
        lances = self.config_data["current_portfolio"]
        return {
            "lances": {
                "name": "Lance's Portfolio",
                "holdings": lances,
                "vol": 0.23,
            },
            "custom": {
                "name": "Custom",
                "holdings": [],
                "vol": 0.20,
            },
        }

    def set_portfolio_override(self, holdings: List[Dict[str, Any]], vol: Optional[float] = None) -> None:
        """Set a temporary portfolio override (not persisted to YAML)."""
        self._portfolio_override = holdings
        if vol is not None:
            self._vol_override = vol

    def clear_portfolio_override(self) -> None:
        """Clear portfolio override, reverting to config.yaml."""
        self._portfolio_override = None
        self._vol_override = None

    def get_portfolio_vol(self) -> float:
        """Get portfolio volatility (override or from factor_premiums.vol)."""
        if self._vol_override is not None:
            return self._vol_override
        return self.get_factor_premiums().vol

    def set_vol_override(self, vol: float) -> None:
        """Set portfolio volatility override."""
        self._vol_override = vol

    @property
    def has_portfolio_override(self) -> bool:
        return self._portfolio_override is not None

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
        # When a custom portfolio is active, get_portfolio_vol() returns the
        # in-memory vol override, which would otherwise shadow an explicit vol
        # edit made here on the Factors page. Keep them in sync so the projected
        # (geometric) return actually reflects the saved volatility.
        if self._vol_override is not None:
            self._vol_override = premiums.vol

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

    def get_regional_split_override(self) -> Dict[Region, float] | None:
        """Get custom regional split override, if set."""
        override = self.config_data.get("regional_split_override")
        if override:
            return {Region[k]: v for k, v in override.items()}
        return None

    def update_regional_split_override(self, split: Dict[Region, float]) -> None:
        """Set a custom regional split override."""
        self.config_data["regional_split_override"] = {
            region.value: value
            for region, value in split.items()
        }
        self.save(self.config_data)

    def clear_regional_split_override(self) -> None:
        """Clear the custom regional split override."""
        self.config_data.pop("regional_split_override", None)
        self.save(self.config_data)


# Global instance
config_manager = ConfigManager()
