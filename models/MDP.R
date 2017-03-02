
findPolicy <- function( changeRate = 0, priorCount=1, nTrials=50, verbose=TRUE) {
  
  # set up
  nActions <- 3
  actions <- c("betA","betB","observe")
  
  # function to pull the count data from state name
  getCounts <- function( b ) {
    s <- as.numeric(strsplit(names(beliefs)[b],split="[AB]")[[1]][c(2,3)])
    names(s) <- c("nA","nB")
    return(s)
  }
  
  # function to return the max, breaking ties randomly
#   whichMax <- function(x,tol=10e-15) {
#     y <- which(x==max(x))
#     sample(y,1)
#   }
  whichMax <- which.max

  # function to make a state name from count data
  makeName <- function( s ) {
    paste0("A",s[1],"B",s[2])
  }
  
  # a belief state is defined by "nA" and "nB", the number of 
  # A and B outcomes that have occurred since the last change
  beliefs <- rep.int(0, (nTrials+1)^2)
  k <- 0
  for( i in 0:nTrials ) {
    for( j in 0:nTrials ) {
      if( i+j <= nTrials ) { 
        k <- k+1
        names(beliefs)[k] <- makeName( c(i,j) )
      }
    }
  }
  nBeliefs <- k
  beliefs <- beliefs[1:k]
  
  # transition matrix for a static world
  transition <- array(data=0,dim=c(nBeliefs,nBeliefs,nActions),
                      dimnames=list(from=names(beliefs),to=names(beliefs),action=actions))
  for( f in 1:nBeliefs) {
    
    
    s <- getCounts( f ) 
    if( sum(s) < nTrials ) { # all actions on the final trial end the game
      
      transition[f,f,"betA"] <- 1 # no new data if you bet on A
      transition[f,f,"betB"] <- 1 # no new data if you bet on B
      addA <- makeName( s + c(1,0) ) # the state name with one more A observation
      addB <- makeName( s + c(0,1) ) # the state name with one more B observation
      probA <- ( s[1]+priorCount ) / (s[1]+s[2]+2*priorCount ) # expected probability of an A
      transition[f,addA,"observe" ] <- probA # probability of moving to the state with an extra A
      transition[f,addB,"observe" ] <- 1-probA # probability of moving to the state with an extra B
      
    } 
    
  }
  
  # transition matrix for a dynamic world
  transition <- transition*(1-changeRate) 
  transition[,"A0B0",] <- changeRate
  transition[1,"A0B0","betA"] <- 1
  transition[1,"A0B0","betB"] <- 1
  
  # function to pull the relevant bits of the transition matrix
  getTransitions <- function( from, action ) {
    t <- transition[from,,action]
    return( t[t>0] )
  }
  
  # compute the expected reward from each state under each action (+1 correct, -1 incorrect)
  reward <- matrix(NA,nBeliefs,nActions,dimnames=list(state=names(beliefs),action=actions))
  for( f in 1:nBeliefs ) {
    s <- getCounts( f ) 
    probA <- ( s[1]+priorCount ) / (s[1]+s[2]+2*priorCount ) # expected probability of an A
    reward[f,"betA"] <- 2*probA - 1
    reward[f,"betB"] <- 1- 2*probA
    reward[f,"observe"] <- 0
  }
  
  # sweep backwards 
  fullPolicy <- matrix(NA,nBeliefs,nTrials,dimnames=list(state=names(beliefs),trial=1:nTrials))
  fullPolicy[,nTrials] <- apply(reward,1,whichMax)
  utilityNext <- apply(reward,1,max)
  for( t in seq(nTrials-1,1,-1)) {
    if (verbose) print(t)
    utilityThis <- reward 
    for( a in actions ){ 
      utilityThis[,a] <- utilityThis[,a] + transition[,,a] %*% utilityNext
    }
    fullPolicy[,t] <- apply(utilityThis,1,whichMax)
    utilityNext <- apply(utilityThis,1,max)
  }
  
  # construct the simplified policy
  diff <- vector( length=nTrials*2+1 )
  for(b in 1:nBeliefs) {
    s <- getCounts(b)
    diff[b] <- s[1]-s[2]
  }
  diffCount <- table(diff)
  simplePolicy <- array(0,dim=c(nTrials*2+1,nTrials,3),dimnames=list(diff=-nTrials:nTrials,trial=1:nTrials,action=actions))
  for( t in 1:nTrials ){
    for( b in 1:nBeliefs) {
      d <- diff[b] + nTrials+1 # -50:50 goes to 1:101 
      a <- fullPolicy[b,t] 
      simplePolicy[d,t,a] <- simplePolicy[d,t,a] + 1/diffCount[d] 
    }
  }
  
  out <- list(
    fullPolicy = fullPolicy,
    simplePolicy = simplePolicy,
    beliefs = beliefs,
    reward = reward,
    transition = transition,
    par = c(changeRate=changeRate, priorCount=priorCount, nTrials=nTrials),
    actions = actions
  )
  class(out) <- "policy"
  return( out )
  
}


plot.policy <- function( x, ymax=10, main="Optimal MDP Probability of Observing" ) {
  
  nTrials <- x$par["nTrials"]
  image( x=1:nTrials,y=-ymax:ymax,
         z=1-t(x$simplePolicy[(-ymax:ymax)+nTrials+1,,"observe"]),
         xlab="Trial Number",
         ylab="Evidence Accrued",
         main=main,
         col= grey(seq(0,1,.01)) )
}

# draw at default settings
p <- findPolicy()
plot(p)


