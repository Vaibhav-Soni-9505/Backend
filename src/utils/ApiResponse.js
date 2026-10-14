class ApiResponse{
  constructor(statuscode,message="sucess",data){
    this.statuscode = statuscode;
    this.message = message;
    this.data = data;
    this.success = statuscode<400;
  }
}

export {ApiResponse}