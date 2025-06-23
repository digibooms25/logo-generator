# Image Editing

FLUX.1 Kontext \[pro] is a model designed for Text-to-Image generation and **advanced Image Editing**. This guide focuses on its Image Editing capabilities. Unlike other models, you don't need to fine-tune or create complex workflows to achieve this - Flux.1 Kontext \[pro] handles it out of the box.

Kontext's image editing, accessed via the `/flux-kontext-pro` endpoint, provides the following key functionalities:

* **Simple Editing**: Change specific parts of an image while keeping the rest untouched
* **Smart Changes**: Make edits that look natural and fit with the rest of the image
* **Text in Images**: Add or modify text within your images

<Info>
  For comprehensive prompting techniques and advanced editing strategies, see our detailed [Prompting Guide - Image-to-Image](/guides/prompting_guide_kontext_i2i).
</Info>

## Examples of Editing

### Basic Object Modifications

FLUX.1 Kontext is really good at straightforward object modification, for example if we want to change the colour of an object, we can prompt it.

For example: `Change the car color to red`

<Columns cols={2}>
  <Frame caption="Before editing">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/3ae6ee032b85373b84934574f3ac3bb2fb792d64-2048x1365.jpg" />
  </Frame>

  <Frame caption="After editing">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/b404ea99e309e5b4bab6fcd82a4a13ad18f2c04b-1248x832.jpg" />
  </Frame>
</Columns>

### Iterative Editing

FLUX.1 Kontext excels at character consistency, even after multiple edits. Starting from a reference picture, we can see that the character is consistent throughout the sequence. The prompts used for each edit are shown in the captions below each image.

<Columns cols={2}>
  <Frame caption="Input Image">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/41fcbaa8d77c2c2d5bb49467ae6b5a89572022fa-1125x750.jpg" />
  </Frame>

  <Frame caption="Remove the object from her face">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/800f6631c695ff5be4b82ef9cae0981073a0fecd-1248x832.jpg" />
  </Frame>
</Columns>

<Columns cols={2}>
  <Frame caption="She is now taking a selfie in the streets of Freiburg, it’s a lovely day out.">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/2090d7d3b1ee0fb83cef25fb94b179163208417b-1248x832.jpg" />
  </Frame>

  <Frame caption="It’s now snowing, everything is covered in snow.">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/cc78fef1c0785656280a120647fb313fda6b977a-1248x832.jpg" />
  </Frame>
</Columns>

### Text Editing

FLUX.1 Kontext can directly edit text that appears in images, making it easy to update signs, posters, labels, and more without recreating the entire image.

The most effective way to edit text is using quotation marks around the specific text you want to change:

**Prompt Structure**: `Replace '[original text]' with '[new text]'`

**Example -** We can see below where we have an input image with "Choose joy" written, and we replace "joy" with "BFL" - note the upper case format for BFL.

<Columns cols={2}>
  <Frame caption="Input image">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/1bcbfec679e9456a7ad24c341a987ff90baa29b4-1024x768.jpg" alt="Input image: Sign saying 'Choose joy'" />
  </Frame>

  <Frame caption="JOY replaced with BFL">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/6cc8691da257f2ee6b7b39c5dcf16985d05e6c08-1184x880.jpg" alt="Output image: Sign changed to 'Choose BFL'" />
  </Frame>
</Columns>

<Columns cols={2}>
  <Frame caption="Input image">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/d6dd70efc9b8135bbf67404ddfc48355d29f81fb-768x1280.jpg" alt="Input image:" />
  </Frame>

  <Frame caption="Sync & Bloom changed to 'FLUX & JOY'">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/4d00e8fc95fa43507e633dd46e692d090c8dcf36-800x1328.jpg" alt="Output image: Text replaced with 'FLUX & JOY'" />
  </Frame>
</Columns>

## Using FLUX.1 Kontext API for Image Editing

This **requires both** a **text prompt** and **an input image** to work, with the input image serving as the base that will be edited according to your prompt.

To use Kontext for image editing, you'll make a request to the `/flux-kontext-pro` endpoint:

### Create Request

<CodeGroup>
  ```bash create_request.sh
  # Install `curl` and `jq`, then run:
  request=$(curl -X POST \
    'https://api.bfl.ai/v1/flux-kontext-pro' \
    -H 'accept: application/json' \
    -H "x-key: ${BFL_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d '{
      "prompt": "<What you want to edit on the image>",
      "input_image": "<base64 converted image>",
  }')
  echo $request
  request_id=$(echo $request | jq -r .id)
  polling_url=$(echo $request | jq -r .polling_url)
  ```

  ```python create_request.py
  # Install `requests` (e.g. `pip install requests`) 
  # and `Pillow` (e.g. `pip install Pillow`)

  import os
  import requests
  import base64
  from PIL import Image
  from io import BytesIO

  # Load and encode your image
  # Replace "<your_image.jpg>" with the path to your image file
  image = Image.open("<your_image.jpg>")
  buffered = BytesIO()
  image.save(buffered, format="JPEG") # Or "PNG" if your image is PNG
  img_str = base64.b64encode(buffered.getvalue()).decode()

  request = requests.post(
      'https://api.bfl.ai/v1/flux-kontext-pro',
      headers={
          'accept': 'application/json',
          'x-key': os.environ.get("BFL_API_KEY"),
          'Content-Type': 'application/json',
      },
      json={
          'prompt': '<What you want to edit on the image>',
          'input_image': img_str,
      },
  ).json()

  print(request)
  request_id = request["id"]
  polling_url = request["polling_url"] # Use this URL for polling
  ```
</CodeGroup>

A successful response will be a json object containing the request's id, that will be used to retrieve the actual result.

### Poll for Result

After submitting a request, you need to poll using the returned `polling_url` to  retrieve the output when ready.

<CodeGroup>
  ```bash poll_result.sh
  while true; do
    sleep 0.5
    result=$(curl -s -X 'GET' \
      "${polling_url}" \
      -H 'accept: application/json' \
      -H "x-key: ${BFL_API_KEY}")
    
    status=$(echo $result | jq -r .status)
    echo "Status: $status"
    
    if [ "$status" == "Ready" ]; then
      echo "Result: $(echo $result | jq -r .result.sample)"
      break
    elif [ "$status" == "Error" ] || [ "$status" == "Failed" ]; then
      echo "Generation failed: $result"
      break
    fi
  done
  ```

  ```python poll_result.py
  # This assumes that the `polling_url` variable is set.

  import time
  import os
  import requests

  while True:
    time.sleep(0.5)
    result = requests.get(
        polling_url,
        headers={
            'accept': 'application/json',
            'x-key': os.environ.get("BFL_API_KEY"),
        },
        params={'id': request_id}
    ).json()
    
    if result['status'] == 'Ready':
        print(f"Image ready: {result['result']['sample']}")
        break
    elif result['status'] in ['Error', 'Failed']:
        print(f"Generation failed: {result}")
        break
  ```
</CodeGroup>

A successful response will be a json object containing the result, and `result['sample']` is a signed URL for retrieval.

<Warning>
  Our signed URLs are only valid for 10 minutes. Please retrieve your result within this timeframe.
</Warning>

## FLUX.1 Kontext Image Editing Parameters (for /flux-kontext-pro)

<Tip>
  FLUX.1 Kontext creates 1024x1024 images by default. Use `aspect_ratio` to adjust the dimensions while keeping the same total pixels.
</Tip>

* **Supported Range**: Aspect ratios can range from 3:7 (portrait) to 7:3 (landscape).
* **Default Behavior**: If `aspect_ratio` is not specified, the model will default to a standard aspect ratio like 1:1 (e.g. 1024x1024).

List of Kontext parameters for image editing via the `/flux-kontext-pro` endpoint:

| Parameter           | Type           | Default  | Description                                                                                        | Required |
| ------------------- | -------------- | -------- | -------------------------------------------------------------------------------------------------- | -------- |
| `prompt`            | string         |          | Text description of the edit to be applied.                                                        | **Yes**  |
| `input_image`       | string         |          | Base64 encoded image to use as reference. Supports up to 20MB or 20 megapixels.                    | **Yes**  |
| `aspect_ratio`      | string / null  | `"1:1"`  | Desired aspect ratio (e.g., "16:9"). All outputs are \~1MP total. Supports ratios from 3:7 to 7:3. | No       |
| `seed`              | integer / null | `null`   | Seed for reproducibility. If `null` or omitted, a random seed is used. Accepts any integer.        | No       |
| `prompt_upsampling` | boolean        | `false`  | If true, performs upsampling on the prompt                                                         | No       |
| `safety_tolerance`  | integer        | `2`      | Moderation level for inputs and outputs. Value ranges from 0 (most strict) to 2 (balanced)         | No       |
| `output_format`     | string         | `"jpeg"` | Desired format of the output image. Can be "jpeg" or "png".                                        | No       |
| `webhook_url`       | string / null  | `null`   | URL for asynchronous completion notification. Must be a valid HTTP/HTTPS URL.                      | No       |
| `webhook_secret`    | string / null  | `null`   | Secret for webhook signature verification, sent in the `X-Webhook-Secret` header.                  | No       |
