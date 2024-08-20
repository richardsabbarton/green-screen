

class Video {
    constructor(credentialsObject, configurationObject){
        window.video = this

        this.credentials = credentialsObject
        this.config = configurationObject
        this.participants = new Array()
        this.mainstage = new Array()
        this.videoSession = false

        this.toolbarOpacity = 0
        this.toolbarFade = false
        this.fadeTimeout = false

        this.mainstageDiv = document.createElement('div')
        this.mainstageDiv.id = 'mainstage'
        this.mainstageDiv.classList.add('mainstage')
        
        window.onmousemove = (event)=>{
            this.toolbar.style.opacity = '100%'
            this.toolbarOpacity = 100
            this.toolbarFade = false
            clearTimeout(this.fadeTimeout)

            this.fadeTimeout = setTimeout(()=>{
                this.toolbarFade = true
                this.fadeOutToolbar()
            }, 5000)
        }
        document.body.appendChild(this.mainstageDiv)

        this.participantsDiv = document.createElement('div')
        this.participantsDiv.id = 'participants'
        this.participantsDiv.classList.add('participants')
        document.body.appendChild(this.participantsDiv)

        this.toolbar = document.createElement('div')
        this.toolbar.id = 'toolbar'
        this.toolbar.classList.add('toolbar')
        this.toolbar.style.opacity = '0%'

        this.camIcon = new Image()
        this.camIcon.src = './images/cam.png'
        this.camIcon.classList.add('btn-icon')
        
        this.camButton = document.createElement('button')
        this.camButton.classList.add('btn-toggle')
        this.camButton.classList.add('btn-enabled')
        this.camButton.id = 'cambutton'
        this.camButton.appendChild(this.camIcon)
        
        this.camButton.onclick = (event)=>{
            if(this.camButton.classList.contains('btn-enabled')){
                this.camButton.classList.remove('btn-enabled')
                this.camButton.classList.add('btn-disabled')
                this.cameraPublisher.publishVideo(false)
            } else {
                this.camButton.classList.remove('btn-disabled')
                this.camButton.classList.add('btn-enabled')
                this.cameraPublisher.publishVideo(true)
            }
        }

        this.micIcon = new Image()
        this.micIcon.src = './images/mic.png'
        this.micIcon.classList.add('btn-icon')

        this.micButton = document.createElement('button')
        this.micButton.classList.add('btn-toggle')
        this.micButton.classList.add('btn-enabled')
        this.micButton.id = 'micbutton'
        this.micButton.appendChild(this.micIcon)
        
        this.micButton.onclick = (event)=>{
            if(this.micButton.classList.contains('btn-enabled')){
                this.micButton.classList.remove('btn-enabled')
                this.micButton.classList.add('btn-disabled')
                this.cameraPublisher.publishAudio(false)
            } else {
                this.micButton.classList.remove('btn-disabled')
                this.micButton.classList.add('btn-enabled')
                this.cameraPublisher.publishAudio(true)
            }
        }


        this.toolbar.appendChild(this.camButton)
        this.toolbar.appendChild(this.micButton)

        document.body.appendChild(this.toolbar)
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

    fadeOutToolbar(){
        if(!this.toolbarFade) return

        this.toolbarOpacity--
        this.toolbar.style.opacity = `${this.toolbarOpacity}%`
        if(this.toolbarOpacity > 0){
            window.requestAnimationFrame(()=>{this.fadeOutToolbar()})
        }
            
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

        this.video = true
        this.audio = true

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
            //publishVideo: false, // For debugging - Remove when done
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
                    this.renderer.disable()
                }
                                                      
            }
        })
    }

    publishVideo(b){
        this.publisher.publishVideo(b)
        this.video = b
    }

    publishAudio(b){
        this.publisher.publishAudio(b)
        this.audio = b
    }

    toggleVideo(){
        this.video = !this.video
        this.publisher.publishVideo(this.video)
        return this.video
    }

    toggleAudio(){
        this.audio = !this.audio
        this.publisher.publishAudio(this.audio)
        return this.audio
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

        this.subscriber.on('disconnect', (event)=>{
            console.log('stream: disconnected: removing output')
            this.renderer.disable()
            document.querySelector('#participants').removeChild(this.outputCanvas)
        })
    }

    
}



class VideoRenderer {
    constructor(sourcevideo, outputcanvas){
        let randomIcon = (Math.floor(Math.random()*14)+1) + '.png'
        this.imageIcon = new Image()
        this.imageIcon.src = `/images/${randomIcon}`
        console.log('Random icon for user: ', this.imageIcon.src)
        
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

        
        let sourceImage = this.videoElement
        //console.log(sourceImage)
        //console.log(this.videoElement.srcObject.getVideoTracks()[0])
        if(!this.videoElement.srcObject.getVideoTracks()[0].enabled){
        //    console.log('updating source image')
            sourceImage = this.imageIcon
            this.width = sourceImage.width
            this.height = sourceImage.height
        }
        
        this.builderCanvas.width = this.width
        this.builderCanvas.height = this.height
        let builderCtx = this.builderCanvas.getContext("2d")
        builderCtx.clearRect(0,0,this.width, this.height)
        
        //console.log(sourceImage)
        builderCtx.drawImage(sourceImage, 0, 0, this.width, this.height)

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
            let a = pix[i+3]

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