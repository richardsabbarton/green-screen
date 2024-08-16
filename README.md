# green-screen

## Video Server

This project is using an existing video server that uses short term room management.  It will create a video session using a memorable and readable name rather than the standard video session id.

## Video Client

There are three options when joining a session.  These are included in the URL when accessing the App.

 - roomName: The human readable room name you wish to access
 - userName: The name of the person accessing the session
 - userRole: One of the following:
   - presenter - Share screen or tab and publish camera stream
   - participant - Publish only your camera and no screen-share
   - viewer - View the session without publish any stream

Example URI: /liveroom.html?roomName=default-room&userName=Richard&userRole=presenter

## Media Flow

### Mainstage

The "mainstage" is where the screen-share component will be displayed, either when published by the "presenter" or when subscribed by participants and viewers.  It captures using the standard videoSource: "screen" option in the publisher options.

### Participants

Participants (including publishers and subscribers) use the same video renderer to process the video locally.  However, there are some caveats.

#### Background Replacement

The publisher of the camera streams uses the built in background replacement features in the Video Client SDK.  However, the image file uses is a single 1x1 square of green.  This has the effect of replacing the background with a single colour before sending over the network (publishing).

#### Camera Subscribers

The video stream is received (subscribed) with a solid green background.  The video is played to the Video Element as normal but the element is hidden from display.  Each frame is then written to an offscreen HTML5 canvas ready for processing.  

Because of variations in colour, hue and saturation, we cannot just replace the single tone of green.  Instead, we need to replace based on a colour threshold that is close enough to trim the background without impeding on the foreground.

#### Colour Selection

```
r:40 g:200 b:40
```

This is the specific shade of green that has been chosen as working best with the following functions.  They are executed on each pixel of the incoming (or publisher) media stream per frame.

```
    adjustPixel(r,g,b,a){
        let c = {r: r, g: g, b: b, a: a} // The current colour of the pixel
        let rb = (r + b) / 2 // Get the red/blue average
        if((this.withinRange(r, b, 40) && g - rb > 20)){
            // If red and blue are close enough together
            // and the green is more than 20 more than the
            // average of the two then the shade must be
            // green (enough) to be marked as transparen.
            c.a = 0
        }
        return c
    }

    withinRange(val1, val2, range){
        let diff = val1 - val2
        if(diff < 0) diff = diff * -1
        if(diff < range){
            return true
        } else {
            return false
        }
    }
```




