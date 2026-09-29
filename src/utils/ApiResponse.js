class ApiResponse{
  constructor(stauscode,message="sucess",data){
    this.stauscode = stauscode;
    this.message = message;
    this.data = data;
    this.success = stauscode<400;
  }
}