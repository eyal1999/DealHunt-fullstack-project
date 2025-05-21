from app.services.search_service import search_products


def test_search_products_returns_list(monkeypatch):
    # Monkeypatch requests.post to avoid real network call here…
    class DummyResp:
        status_code = 200

        @staticmethod
        def json():
            return {
                "resp_code": 200,
                "resp_result": {
                    "result": {
                        "products": {
                            "product": [
                                {
                                    "product_id": "1",
                                    "product_title": "Demo",
                                    "original_price": "10.0",
                                    "sale_price": "8.0",
                                    "product_main_image_url": "https://img",
                                    "product_detail_url": "https://detail",
                                }
                            ]
                        }
                    }
                },
            }

    monkeypatch.setattr("app.services.search_service.requests.post", lambda *a, **k: DummyResp())

    res = search_products("demo")
    assert isinstance(res, list) and len(res) == 1
