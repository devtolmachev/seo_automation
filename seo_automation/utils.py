

from typing import Any


def convert_scraped_data_to_test_data(
    input_scraped_data: dict[str, Any],
    id: str,
    id_page: str,
) -> str:
    
    test_data = []
    
    default_properties = {
        "id": id,
        "id_page": id_page,
        "status": True,
        "force_set": True
    }
    
    updated_part = "[UPDATED] "
    
    keywords_count = 0
    contents_count = 0
    selectors_filled = 0
    selectors_unfilled = 0
    attribute_to_update_count = 0
    for metatag in input_scraped_data["result"]["metatags"]:
        data = {
            "type": "keyword",
            "selector": metatag["selector"],
            "old": metatag["content"],
            "new": updated_part + metatag["content"],
            "attribute_to_update": "content"
        }
        data.update(default_properties)
        test_data.append(data)
        
    for image in input_scraped_data["result"]["images"]:
        data = {
            "type": "image",
            "selector": image["selector"],
            "new": updated_part + image["alt"],
        }
        data.update(default_properties)
        test_data.append(data)
        
    for content in input_scraped_data["result"]["content"]:
        data = {
            "type": "content",
            "old": content["content"],
            "new": updated_part + content["content"],
            "selector": content["selector"],
            "new_selector": content["selector"] + " h1"
        }
        data.update(default_properties)
        test_data.append(data)
        
    for internal_link in input_scraped_data["result"]["internal_links"]:
        data = {
            "type": "internal_link",
            "old": internal_link["href"],
            "new": f"{internal_link["href"]}{updated_part}"
        }
        data.update(default_properties)
        test_data.append(data)
        
    for external_link in input_scraped_data["result"]["external_links"]:
        data = {
            "type": "external_links",
            "old": external_link["href"],
            "new": f"{external_link["href"]}{updated_part}",
        }
        data.update(default_properties)
        test_data.append(data)
    
    return test_data


# from pprint import pprint
# import json
# with open("flutter_scrapped_data.json") as f:
#     test_data = convert_scraped_data_to_test_data(
#         json.load(f), "id", "id_page"
#     )
    
# with open('test_data_flutter.json', "w") as f:
#     json.dump(test_data, f, ensure_ascii=False, indent=4)

