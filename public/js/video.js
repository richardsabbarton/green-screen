

class Video {
    constructor(credentialsObject, configurationObject){
        this.credentials = credentialsObject
        this.config = configurationObject
        this.participants = new Array()
        this.mainstage = new Array()
        this.videoSession = false

        this.mainstageDiv = document.createElement('div')
        this.mainstageDiv.id = 'mainstage'
        this.mainstageDiv.classList.add('mainstage')
        document.body.appendChild(this.mainstageDiv)

        this.participantsDiv = document.createElement('div')
        this.participantsDiv.id = 'participants'
        this.participantsDiv.classList.add('participants')
        document.body.appendChild(this.participantsDiv)

    }

    connectSession(){
        return new Promise((resolve, reject)=>{
            this.videoSession = OT.initSession(this.credentials.apiKey, this.credentials.sessionId)

            console.log('connecting session')
            this.videoSession.connect(this.credentials.token, (error)=>{
                if(error){
                    reject(error)
                } else {
                    console.log('session connected')
                    this.initCallbacks()
                    resolve(this)
                }
            })
        })
    }

    initCallbacks(){
        console.log('initialising callback events')
        this.videoSession.on("streamCreated", (event)=>{
            console.log('New streamCreated Event')
            console.log(event.stream)
            if(event.stream.videoType == 'camera'){
                let sub = new CameraSubscriber(this.videoSession, event.stream)
                this.participants.push(sub)
            }
            if(event.stream.videoType == 'screen'){
                let sub = new screenSubscriber(this.videoSession, event.stream)
                this.mainstage.push(sub)
            }
        })
    }

    publishCamera(role){
        return new Promise((resolve, reject)=>{
            this.cameraPublisher = new CameraPublisher(this.videoSession)
            this.participants.push(this.cameraPublisher)
        })
    }

    publishScreen(){
        this.screenPublisher = new screenPublisher(this.videoSession)
        this.mainstage.push(this.screenPublisher)
    }
}


class screenPublisher {
    constructor(OTSession){
        console.log('publishing screen')
        this.session = OTSession
        
        let publisherOptions = {
            videoSource: 'screen',
            publishAudio: false,
            width: "100%",
            height: "100%",
            insertMode: "replace"
        }
        console.log(OTSession)
        this.publisher = OT.initPublisher('mainstage', publisherOptions, (event)=>{
            OTSession.publish(this.publisher)

        })
    }
}

class screenSubscriber {
    constructor(OTSession, OTStream){
        this.session = OTSession
        this.stream = OTStream
        this.subscriberDiv = document.createElement("div")
        this.subscriberDiv.id = OTStream.id
        document.querySelector('#mainstage').appendChild(this.subscriberDiv)
        
        const subscriberOptions = {
            insertMode: 'replace',
            width: '100%',
            height: '100%',
            preferredResolution: 'auto',
            //fitMode: 'cover'
        }

        this.subscriber = this.session.subscribe(OTStream, this.subscriberDiv, subscriberOptions, (error)=>{
            if(error){
                console.log(error)
            } else {
                this.videoElement = this.subscriberDiv.querySelector("video")
                this.videoElement.onloadeddata = (event)=>{
                    this.renderer = new VideoRenderer(this.videoElement, this.outputCanvas)                   
                    this.renderer.processFrames()

                }
            }
            
        })
    }
}

class CameraPublisher {
    constructor(OTSession){
        console.log('publishing camera')
        this.session = OTSession

        this.audioLevel = 0
        this.opacity = 0
        this.fadeDelay = 0

        this.outputCanvas = document.createElement("canvas")
        this.outputCanvas.id = "publisher-outputcanvas"
        this.outputCanvas.classList.add('participant')
        this.videoElement = false
        this.publisherDiv = document.createElement("div")
        this.publisherDiv.id = "videopublishcontainer"
        this.publisherDiv.style.display = "none"
        document.body.append(this.publisherDiv)
        document.querySelector('#participants').append(this.outputCanvas)

        let publisherOptions = {
            showControls: false,
            //resolution: "320x240",
            videoFilter: {
                type: "backgroundReplacement",
                backgroundImgUrl: "/images/greenscreen.png" // r:40 g:200 b:40
            }
        }

        this.publisher = OT.initPublisher(this.publisherDiv, publisherOptions, (event)=>{
            this.videoElement = this.publisherDiv.querySelector("video")
            this.videoElement.onloadeddata = (event)=>{
                console.log("Video Loaded Data")
                this.renderer = new VideoRenderer(this.videoElement, this.outputCanvas)
                this.renderer.processFrames()
                this.session.publish(this.publisher)
            }
        })

        this.publisher.on('audioLevelUpdated',(event)=>{
            if(event.audioLevel > 0.2){
                if(!this.renderer.enabled){
                    this.renderer.enable()
                    document.querySelector('#participants').prepend(this.outputCanvas)
                }
                this.opacity = 1.0
                this.fadeDelay = 120
            } else {
                this.fadeDelay--
                if(this.fadeDelay < 10){
                    this.fadeDelay = 0
                    this.opacity-= 0.01
                }
            }
            this.outputCanvas.style.opacity = this.opacity
            if(this.opacity <= 0.0){
                this.opacity = 0.0
                if(this.renderer.enabled){
                    document.querySelector('#participants').removeChild(this.outputCanvas)
                    this.renderer.disable()
                }
                                                      
            }
        })
    }
}


class CameraSubscriber {
    constructor(OTSession, OTStream){
        this.session = OTSession
        this.stream = OTStream
        this.subscriber = false

        this.audioLevel = 0
        this.opacity = 0
        this.fadeDelay = 0

        this.outputCanvas = document.createElement("canvas")
        this.outputCanvas.id = OTStream.id + "-outputcanvas"
        this.outputCanvas.classList.add('participant')
        this.videoElement = false
        this.subscriberDiv = document.createElement("div")
        this.subscriberDiv.id = OTStream.id
        this.subscriberDiv.style.width = '320px'
        this.subscriberDiv.style.height = '180px'
        this.subscriberDiv.style.display = "none"
        document.body.append(this.subscriberDiv)
        document.querySelector('#participants').append(this.outputCanvas)

        this.videoRenderer = false

        const subscriberOptions = {
            insertMode: 'replace',
            width: '100%',
            height: '100%',
            preferredResolution: 'auto',
            fitMode: 'cover'
        }

        this.subscriber = this.session.subscribe(OTStream, this.subscriberDiv, subscriberOptions, (error)=>{
            if(error){
                console.log(error)
            } else {
                this.videoElement = this.subscriberDiv.querySelector("video")
                this.videoElement.onloadeddata = (event)=>{
                    this.renderer = new VideoRenderer(this.videoElement, this.outputCanvas)                   
                    this.renderer.processFrames()

                }
            }
            
        })

        this.subscriber.on('audioLevelUpdated',(event)=>{

            if(event.audioLevel > 0.2){
                if(!this.renderer.enabled){
                    this.renderer.enable()
                    document.querySelector('#participants').prepend(this.outputCanvas)
                }
                this.opacity = 1.0
                this.fadeDelay = 120
            } else {
                this.fadeDelay--
                if(this.fadeDelay < 10){
                    this.fadeDelay = 0
                    this.opacity-= 0.01
                }
            }
            this.outputCanvas.style.opacity = this.opacity
            if(this.opacity <= 0.0){
                this.opacity = 0.0
                if(this.renderer.enabled){
                    document.querySelector('#participants').removeChild(this.outputCanvas)
                    this.renderer.disable()
                }
                                                      
            }
        })
    }

    
}



class VideoRenderer {
    constructor(sourcevideo, outputcanvas){
        this.targetFPS = 30
        this.videoElement = sourcevideo
        this.width = sourcevideo.videoWidth
        this.height = sourcevideo.videoHeight
        this.outputCanvas = outputcanvas
        this.builderCanvas = document.createElement("canvas")
        this.enabled = false
        
    }

    enable(){
        if(!this.enabled){
           this.enabled = true
            this.processFrames() 
        }
        
    }

    disable(){
        this.enabled = false
    }

    processFrames(){
        if(!this.enabled) return

        this.width = this.videoElement.videoWidth
        this.height = this.videoElement.videoHeight

        this.builderCanvas.width = this.width
        this.builderCanvas.height = this.height
        let builderCtx = this.builderCanvas.getContext("2d")
        builderCtx.clearRect(0,0,this.width, this.height)
        builderCtx.drawImage(this.videoElement, 0, 0, this.width, this.height)

        this.outputCanvas.width = this.width
        this.outputCanvas.height = this.height
        let outputCtx = this.outputCanvas.getContext("2d")

        var imgdata = builderCtx.getImageData(0, 0, this.width, this.height);
        var pix = imgdata.data;

        for (var i = 0, n = pix.length; i < n; i += 4) {
            //pix[i  ] = 255 - pix[i  ]; // red
            //pix[i+1] = 255 - pix[i+1]; // green
            //pix[i+2] = 255 - pix[i+2]; // blue
            // i+3 is alpha (the fourth element)
            let r = pix[i]
            let g = pix[i+1]
            let b = pix[i+2]
            let a = 255

            let newColor = this.adjustPixel(r,g,b,a)

            pix[i] = newColor.r
            pix[i+1] = newColor.g
            pix[i+2] = newColor.b
            pix[i+3] = newColor.a
            
        }

        builderCtx.clearRect(0,0,this.width,this.height)
        // Draw the ImageData at the given (x,y) coordinates.
        builderCtx.putImageData(imgdata, 0, 0)


        outputCtx.drawImage(this.builderCanvas, 0, 0, this.width, this.height)

        this.animationFrameId = window.requestAnimationFrame(()=>{this.processFrames()})
        //setTimeout(()=>{
        //    this.processFrames()
        //}, 1000/this.targetFPS )

    }

    adjustPixel(r,g,b,a){
        let c = {r: r, g: g, b: b, a: a}

        let rb = (r + b) / 2
        if((this.withinRange(r, b, 40) && g - rb > 20)){
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
}


export {Video}