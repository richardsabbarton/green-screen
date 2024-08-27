
// Display Class
// Handles the outer bounds of the display area to ensure that 
// usage of available space is optimised.

class Display {
    constructor(configObject){
        this.config = configObject
        this.width = 0
        this.height = 0

        this.initialiseDisplay()
    }

    initialiseDisplay(){
        this.resize()
        // when the window size changes we 
        // update the display and adjust elements
        window.onresize = (event)=>{
            this.resize()
        }
    }

    resize(){
        // Update width and height of this object.
        this.width = window.innerWidth
        this.height = window.innerHeight

        
    }

    update(participants, mainstage){
        participants.forEach((participant, index)=>{
            // The order of the participant array governs 
            // the horizontal position of the participant video
            participant.style.left = (330 * index) + 'px'
        })
    }

}


export {Display}