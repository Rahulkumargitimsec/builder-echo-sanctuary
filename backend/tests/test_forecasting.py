import unittest
from datetime import datetime, timedelta, timezone

from app.services.forecasting import MODEL_NAMES, build_forecast, compare_models


class ForecastingTests(unittest.TestCase):
    def setUp(self) -> None:
        start = datetime(2025, 1, 1, tzinfo=timezone.utc)
        self.rows = [(start + timedelta(hours=index), 100 + index * 2) for index in range(8)]

    def test_forecast_uses_imported_observations(self) -> None:
        result = build_forecast(self.rows, horizon=4, model_name="weighted_ensemble")

        self.assertFalse(result.used_fallback)
        self.assertEqual(result.data_points, 8)
        self.assertEqual(len(result.points), 4)
        self.assertTrue(all(point.demand_mw > 0 for point in result.points))
        self.assertTrue(0 <= result.points[0].confidence <= 1)

    def test_empty_dataset_uses_stable_fallback(self) -> None:
        result = build_forecast([], horizon=2, model_name="persistence")

        self.assertTrue(result.used_fallback)
        self.assertEqual(result.data_points, 12)
        self.assertEqual(len(result.points), 2)

    def test_all_supported_models_return_metrics(self) -> None:
        comparison = compare_models(self.rows)

        self.assertEqual({item["model_name"] for item in comparison}, set(MODEL_NAMES))
        self.assertTrue(all("mae" in item["metrics"] for item in comparison))

    def test_invalid_horizon_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            build_forecast(self.rows, horizon=0)

        with self.assertRaises(ValueError):
            build_forecast(self.rows, horizon=169)


if __name__ == "__main__":
    unittest.main()
