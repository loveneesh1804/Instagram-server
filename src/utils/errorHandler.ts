class Errorhandler extends Error {
    constructor(public message : string,public statusCode : number){
        super(message);
        this.statusCode = statusCode;
    }
}

export default Errorhandler;