

class Display {
    constructor(configObject){
        this.config = configObject
        this.width = 0
        this.height = 0

        this.initialiseDisplay()
    }

    initialiseDisplay(){
        this.resize()
        window.onresize = (event)=>{
            this.resize()
        }
    }

    resize(){
        this.width = window.innerWidth
        this.height = window.innerHeight

        
    }

    update(participants, mainstage){
        participants.forEach((participant, index)=>{
            participant.style.left = (330 * index) + 'px'
        })
    }

}


export {Display}